CREATE DATABASE richlist;

\c richlist;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referrer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status user_status DEFAULT 'active',
    has_deposited BOOLEAN DEFAULT FALSE,
    deposit_amount DECIMAL(10,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    direct_referrals_count INTEGER DEFAULT 0,
    depositing_referrals_count INTEGER DEFAULT 0,
    successor_nominated BOOLEAN DEFAULT FALSE,
    successor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE listlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position_1_id UUID REFERENCES users(id) ON DELETE SET NULL,
    position_2_id UUID REFERENCES users(id) ON DELETE SET NULL,
    position_3_id UUID REFERENCES users(id) ON DELETE SET NULL,
    position_4_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_successor_listline BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT position_4_is_owner CHECK (position_4_id = owner_id)
);

CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    status payment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    to_system BOOLEAN DEFAULT FALSE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    listline_id UUID NOT NULL REFERENCES listlines(id) ON DELETE CASCADE,
    deposit_id UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
    status payment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT payment_recipient CHECK (
        (to_user_id IS NOT NULL AND to_system = FALSE) OR
        (to_user_id IS NULL AND to_system = TRUE)
    )
);

CREATE TABLE successor_nominations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nominator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    successor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_listline_id UUID NOT NULL REFERENCES listlines(id) ON DELETE CASCADE,
    new_listline_id UUID REFERENCES listlines(id) ON DELETE SET NULL,
    position_1_beneficiary_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_users CHECK (nominator_id != successor_id)
);

CREATE TABLE earnings_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    source_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    earning_type VARCHAR(50) DEFAULT 'referral',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount DECIMAL(10,2) NOT NULL,
    source_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    reason VARCHAR(255) DEFAULT 'empty_position_1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_referrer ON users(referrer_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_has_deposited ON users(has_deposited);
CREATE INDEX idx_listlines_owner ON listlines(owner_id);
CREATE INDEX idx_listlines_position_1 ON listlines(position_1_id);
CREATE INDEX idx_deposits_user ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_payments_from_user ON payments(from_user_id);
CREATE INDEX idx_payments_to_user ON payments(to_user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_earnings_user ON earnings_log(user_id);
CREATE INDEX idx_successor_nominator ON successor_nominations(nominator_id);

CREATE OR REPLACE FUNCTION get_upline_chain(user_id UUID, levels INTEGER DEFAULT 3)
RETURNS TABLE(level INTEGER, upline_user_id UUID) AS $$
DECLARE
    current_id UUID := user_id;
    current_level INTEGER := 0;
BEGIN
    WHILE current_level < levels AND current_id IS NOT NULL LOOP
        SELECT referrer_id INTO current_id FROM users WHERE id = current_id;
        IF current_id IS NOT NULL THEN
            current_level := current_level + 1;
            level := current_level;
            upline_user_id := current_id;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_listline_for_user(new_user_id UUID)
RETURNS UUID AS $$
DECLARE
    listline_id UUID;
    pos1 UUID := NULL;
    pos2 UUID := NULL;
    pos3 UUID := NULL;
    upline RECORD;
BEGIN
    FOR upline IN SELECT * FROM get_upline_chain(new_user_id, 3) ORDER BY level DESC LOOP
        CASE upline.level
            WHEN 3 THEN pos1 := upline.upline_user_id;
            WHEN 2 THEN pos2 := upline.upline_user_id;
            WHEN 1 THEN pos3 := upline.upline_user_id;
        END CASE;
    END LOOP;

    INSERT INTO listlines (owner_id, position_1_id, position_2_id, position_3_id, position_4_id)
    VALUES (new_user_id, pos1, pos2, pos3, new_user_id)
    RETURNING id INTO listline_id;

    RETURN listline_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_deposit_payment(deposit_id UUID)
RETURNS UUID AS $$
DECLARE
    dep RECORD;
    ll RECORD;
    payment_id UUID;
    recipient_id UUID;
    is_system BOOLEAN := FALSE;
BEGIN
    SELECT * INTO dep FROM deposits WHERE id = deposit_id;
    SELECT * INTO ll FROM listlines WHERE owner_id = dep.user_id ORDER BY created_at DESC LIMIT 1;

    IF ll.position_1_id IS NULL THEN
        is_system := TRUE;
        recipient_id := NULL;
    ELSE
        recipient_id := ll.position_1_id;
    END IF;

    INSERT INTO payments (from_user_id, to_user_id, to_system, amount, listline_id, deposit_id, status)
    VALUES (dep.user_id, recipient_id, is_system, dep.amount, ll.id, deposit_id, 'completed')
    RETURNING id INTO payment_id;

    IF is_system THEN
        INSERT INTO system_earnings (amount, source_user_id, payment_id)
        VALUES (dep.amount, dep.user_id, payment_id);
    ELSE
        INSERT INTO earnings_log (user_id, amount, source_user_id, payment_id)
        VALUES (recipient_id, dep.amount, dep.user_id, payment_id);

        UPDATE users SET total_earnings = total_earnings + dep.amount WHERE id = recipient_id;
    END IF;

    UPDATE users SET has_deposited = TRUE, deposit_amount = dep.amount WHERE id = dep.user_id;
    UPDATE deposits SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = deposit_id;

    RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_successor_eligibility(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    depositing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO depositing_count
    FROM users
    WHERE referrer_id = user_id AND has_deposited = TRUE;

    RETURN depositing_count >= 13;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_successor_listline(
    nominator_id UUID,
    successor_id UUID
)
RETURNS UUID AS $$
DECLARE
    original_ll RECORD;
    new_listline_id UUID;
    nomination_id UUID;
BEGIN
    SELECT * INTO original_ll
    FROM listlines
    WHERE owner_id = nominator_id AND is_successor_listline = FALSE
    ORDER BY created_at ASC LIMIT 1;

    INSERT INTO listlines (
        owner_id,
        position_1_id,
        position_2_id,
        position_3_id,
        position_4_id,
        is_successor_listline
    )
    VALUES (
        successor_id,
        original_ll.position_1_id,
        original_ll.position_2_id,
        original_ll.position_3_id,
        successor_id,
        TRUE
    )
    RETURNING id INTO new_listline_id;

    UPDATE users
    SET referrer_id = original_ll.position_1_id
    WHERE id = successor_id;

    INSERT INTO successor_nominations (
        nominator_id,
        successor_id,
        original_listline_id,
        new_listline_id,
        position_1_beneficiary_id
    )
    VALUES (
        nominator_id,
        successor_id,
        original_ll.id,
        new_listline_id,
        original_ll.position_1_id
    )
    RETURNING id INTO nomination_id;

    UPDATE users SET successor_nominated = TRUE, successor_id = successor_id WHERE id = nominator_id;

    RETURN new_listline_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_referral_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.referrer_id IS NOT NULL THEN
        UPDATE users
        SET direct_referrals_count = direct_referrals_count + 1
        WHERE id = NEW.referrer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_counts
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION update_referral_counts();

CREATE OR REPLACE FUNCTION update_depositing_referral_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.has_deposited = TRUE AND OLD.has_deposited = FALSE THEN
        UPDATE users
        SET depositing_referrals_count = depositing_referrals_count + 1
        WHERE id = NEW.referrer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_depositing_counts
AFTER UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_depositing_referral_counts();

CREATE VIEW user_dashboard AS
SELECT
    u.id,
    u.username,
    u.email,
    u.referral_code,
    u.total_earnings,
    u.direct_referrals_count,
    u.depositing_referrals_count,
    u.has_deposited,
    r.username AS referrer_username,
    (SELECT COUNT(*) FROM successor_nominations WHERE nominator_id = u.id) AS successors_nominated,
    check_successor_eligibility(u.id) AS eligible_for_successor
FROM users u
LEFT JOIN users r ON u.referrer_id = r.id;

CREATE VIEW earnings_summary AS
SELECT
    u.id,
    u.username,
    u.total_earnings,
    (SELECT COUNT(*) FROM earnings_log WHERE user_id = u.id) AS payment_count,
    (SELECT COALESCE(SUM(amount), 0) FROM system_earnings WHERE source_user_id = u.id) AS paid_to_system
FROM users u;
