CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'terminated');
CREATE TYPE deposit_status AS ENUM ('pending', 'verified', 'cleared', 'refunded', 'chargedback');
CREATE TYPE withdrawal_status AS ENUM ('pending', 'processing', 'completed', 'rejected');
CREATE TYPE earning_type AS ENUM ('deposit', 'successor');
CREATE TYPE flag_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referrer_id UUID REFERENCES users(id),
    status user_status DEFAULT 'pending',
    kyc_verified BOOLEAN DEFAULT FALSE,
    kyc_verified_at TIMESTAMPTZ,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    total_earnings DECIMAL(12, 2) DEFAULT 0.00,
    total_withdrawn DECIMAL(12, 2) DEFAULT 0.00,
    direct_recruits_count INTEGER DEFAULT 0,
    depositing_recruits_count INTEGER DEFAULT 0,
    successor_nominated BOOLEAN DEFAULT FALSE,
    successor_id UUID REFERENCES users(id),
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    balance DECIMAL(12, 2) DEFAULT 0.00,
    total_collected DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_account (name) VALUES ('SYSTEM');

CREATE TABLE referral_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    uses_count INTEGER DEFAULT 0,
    max_uses INTEGER,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE listlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position_1_user_id UUID REFERENCES users(id),
    position_1_is_system BOOLEAN DEFAULT FALSE,
    position_2_user_id UUID REFERENCES users(id),
    position_2_is_system BOOLEAN DEFAULT FALSE,
    position_3_user_id UUID REFERENCES users(id),
    position_3_is_system BOOLEAN DEFAULT FALSE,
    position_4_user_id UUID NOT NULL REFERENCES users(id),
    is_successor_listline BOOLEAN DEFAULT FALSE,
    original_referrer_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT position_4_is_user CHECK (position_4_user_id = user_id)
);

CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 10.00,
    currency VARCHAR(3) DEFAULT 'EUR',
    status deposit_status DEFAULT 'pending',
    payment_processor VARCHAR(50),
    payment_reference VARCHAR(255),
    listline_id UUID REFERENCES listlines(id),
    recipient_user_id UUID REFERENCES users(id),
    recipient_is_system BOOLEAN DEFAULT FALSE,
    cleared_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    chargeback_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_system_earning BOOLEAN DEFAULT FALSE,
    amount DECIMAL(12, 2) NOT NULL,
    earning_type earning_type NOT NULL,
    source_user_id UUID NOT NULL REFERENCES users(id),
    deposit_id UUID REFERENCES deposits(id),
    status deposit_status DEFAULT 'pending',
    cleared_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE successor_nominations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nominator_id UUID NOT NULL REFERENCES users(id),
    successor_id UUID NOT NULL REFERENCES users(id),
    new_parent_id UUID NOT NULL REFERENCES users(id),
    original_listline_id UUID REFERENCES listlines(id),
    successor_listline_id UUID REFERENCES listlines(id),
    deposit_count_at_nomination INTEGER NOT NULL,
    announced_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status withdrawal_status DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_details JSONB DEFAULT '{}',
    processed_at TIMESTAMPTZ,
    rejected_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT min_withdrawal CHECK (amount >= 10.00)
);

CREATE TABLE fraud_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    flag_type VARCHAR(100) NOT NULL,
    severity flag_severity DEFAULT 'low',
    description TEXT,
    evidence JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    count INTEGER DEFAULT 1,
    UNIQUE (user_id, action_type, period_start)
);

CREATE INDEX idx_users_referrer ON users(referrer_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_email_trgm ON users USING GIN(email gin_trgm_ops);
CREATE INDEX idx_referral_links_user ON referral_links(user_id);
CREATE INDEX idx_referral_links_code ON referral_links(code);
CREATE INDEX idx_referral_links_active ON referral_links(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_listlines_user ON listlines(user_id);
CREATE INDEX idx_listlines_position_1 ON listlines(position_1_user_id);
CREATE INDEX idx_listlines_successor ON listlines(is_successor_listline) WHERE is_successor_listline = TRUE;
CREATE INDEX idx_deposits_user ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_deposits_recipient ON deposits(recipient_user_id);
CREATE INDEX idx_deposits_created_at ON deposits(created_at DESC);
CREATE INDEX idx_earnings_user ON earnings(user_id);
CREATE INDEX idx_earnings_source ON earnings(source_user_id);
CREATE INDEX idx_earnings_status ON earnings(status);
CREATE INDEX idx_earnings_type ON earnings(earning_type);
CREATE INDEX idx_successor_nominations_nominator ON successor_nominations(nominator_id);
CREATE INDEX idx_successor_nominations_successor ON successor_nominations(successor_id);
CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_fraud_flags_user ON fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_severity ON fraud_flags(severity);
CREATE INDEX idx_fraud_flags_unresolved ON fraud_flags(resolved) WHERE resolved = FALSE;
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action_type, period_start);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deposits_updated_at
    BEFORE UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER withdrawals_updated_at
    BEFORE UPDATE ON withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(20) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * 36 + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_upline_chain(p_user_id UUID, p_depth INTEGER DEFAULT 4)
RETURNS TABLE(level INTEGER, user_id UUID, user_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE upline AS (
        SELECT 1 AS lvl, u.id, u.name, u.referrer_id
        FROM users u
        WHERE u.id = p_user_id

        UNION ALL

        SELECT up.lvl + 1, u.id, u.name, u.referrer_id
        FROM users u
        INNER JOIN upline up ON u.id = up.referrer_id
        WHERE up.lvl < p_depth
    )
    SELECT lvl, upline.id, upline.name
    FROM upline
    ORDER BY lvl;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION build_listline(p_user_id UUID)
RETURNS TABLE(
    position_1_user_id UUID,
    position_1_is_system BOOLEAN,
    position_2_user_id UUID,
    position_2_is_system BOOLEAN,
    position_3_user_id UUID,
    position_3_is_system BOOLEAN,
    position_4_user_id UUID
) AS $$
DECLARE
    upline_arr UUID[];
BEGIN
    SELECT ARRAY_AGG(uc.user_id ORDER BY uc.level)
    INTO upline_arr
    FROM get_upline_chain(p_user_id, 4) uc;

    position_4_user_id := p_user_id;

    IF array_length(upline_arr, 1) >= 2 THEN
        position_3_user_id := upline_arr[2];
        position_3_is_system := FALSE;
    ELSE
        position_3_user_id := NULL;
        position_3_is_system := TRUE;
    END IF;

    IF array_length(upline_arr, 1) >= 3 THEN
        position_2_user_id := upline_arr[3];
        position_2_is_system := FALSE;
    ELSE
        position_2_user_id := NULL;
        position_2_is_system := TRUE;
    END IF;

    IF array_length(upline_arr, 1) >= 4 THEN
        position_1_user_id := upline_arr[4];
        position_1_is_system := FALSE;
    ELSE
        position_1_user_id := NULL;
        position_1_is_system := TRUE;
    END IF;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_new_user_deposit()
RETURNS TRIGGER AS $$
DECLARE
    listline_rec RECORD;
    new_listline_id UUID;
BEGIN
    SELECT * INTO listline_rec FROM build_listline(NEW.user_id);

    INSERT INTO listlines (
        user_id,
        position_1_user_id, position_1_is_system,
        position_2_user_id, position_2_is_system,
        position_3_user_id, position_3_is_system,
        position_4_user_id,
        is_successor_listline
    ) VALUES (
        NEW.user_id,
        listline_rec.position_1_user_id, listline_rec.position_1_is_system,
        listline_rec.position_2_user_id, listline_rec.position_2_is_system,
        listline_rec.position_3_user_id, listline_rec.position_3_is_system,
        listline_rec.position_4_user_id,
        FALSE
    ) RETURNING id INTO new_listline_id;

    UPDATE deposits
    SET listline_id = new_listline_id,
        recipient_is_system = listline_rec.position_1_is_system,
        recipient_user_id = listline_rec.position_1_user_id
    WHERE id = NEW.id;

    IF listline_rec.position_1_is_system THEN
        UPDATE system_account
        SET balance = balance + NEW.amount,
            total_collected = total_collected + NEW.amount;

        INSERT INTO earnings (is_system_earning, amount, earning_type, source_user_id, deposit_id, status)
        VALUES (TRUE, NEW.amount, 'deposit', NEW.user_id, NEW.id, NEW.status);
    ELSE
        INSERT INTO earnings (user_id, amount, earning_type, source_user_id, deposit_id, status)
        VALUES (listline_rec.position_1_user_id, NEW.amount, 'deposit', NEW.user_id, NEW.id, NEW.status);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deposit_process_listline
    AFTER INSERT ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION process_new_user_deposit();

CREATE OR REPLACE FUNCTION update_referrer_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.referrer_id IS NOT NULL THEN
        UPDATE users
        SET direct_recruits_count = direct_recruits_count + 1
        WHERE id = NEW.referrer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_update_referrer_counts
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_referrer_counts();

CREATE OR REPLACE FUNCTION update_depositing_recruits_count()
RETURNS TRIGGER AS $$
DECLARE
    referrer UUID;
BEGIN
    IF NEW.status = 'cleared' AND (OLD.status IS NULL OR OLD.status != 'cleared') THEN
        SELECT referrer_id INTO referrer FROM users WHERE id = NEW.user_id;

        IF referrer IS NOT NULL THEN
            UPDATE users
            SET depositing_recruits_count = depositing_recruits_count + 1
            WHERE id = referrer;

            PERFORM check_successor_eligibility(referrer);
        END IF;

        IF NOT NEW.recipient_is_system AND NEW.recipient_user_id IS NOT NULL THEN
            UPDATE users
            SET balance = balance + NEW.amount,
                total_earnings = total_earnings + NEW.amount
            WHERE id = NEW.recipient_user_id;

            UPDATE earnings
            SET status = 'cleared', cleared_at = NOW()
            WHERE deposit_id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deposit_update_counts
    AFTER UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_depositing_recruits_count();

CREATE OR REPLACE FUNCTION check_successor_eligibility(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    user_rec RECORD;
    listline_rec RECORD;
    successor_candidate UUID;
    new_parent UUID;
    new_listline_id UUID;
BEGIN
    SELECT * INTO user_rec FROM users WHERE id = p_user_id;

    IF user_rec.successor_nominated OR user_rec.depositing_recruits_count < 13 THEN
        RETURN;
    END IF;

    SELECT * INTO listline_rec
    FROM listlines
    WHERE user_id = p_user_id AND is_successor_listline = FALSE
    ORDER BY created_at DESC
    LIMIT 1;

    IF listline_rec.position_1_is_system THEN
        RETURN;
    END IF;

    new_parent := listline_rec.position_1_user_id;

    SELECT u.id INTO successor_candidate
    FROM users u
    JOIN deposits d ON d.user_id = u.id
    WHERE u.referrer_id = p_user_id
      AND d.status = 'cleared'
    ORDER BY d.created_at DESC
    LIMIT 1;

    IF successor_candidate IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO listlines (
        user_id,
        position_1_user_id, position_1_is_system,
        position_2_user_id, position_2_is_system,
        position_3_user_id, position_3_is_system,
        position_4_user_id,
        is_successor_listline,
        original_referrer_id
    ) VALUES (
        successor_candidate,
        listline_rec.position_1_user_id, listline_rec.position_1_is_system,
        listline_rec.position_2_user_id, listline_rec.position_2_is_system,
        listline_rec.position_3_user_id, listline_rec.position_3_is_system,
        successor_candidate,
        TRUE,
        p_user_id
    ) RETURNING id INTO new_listline_id;

    UPDATE users SET referrer_id = new_parent WHERE id = successor_candidate;
    UPDATE users SET successor_nominated = TRUE, successor_id = successor_candidate WHERE id = p_user_id;
    UPDATE users SET direct_recruits_count = direct_recruits_count + 1 WHERE id = new_parent;
    UPDATE users SET direct_recruits_count = direct_recruits_count - 1 WHERE id = p_user_id;

    INSERT INTO successor_nominations (
        nominator_id, successor_id, new_parent_id,
        original_listline_id, successor_listline_id,
        deposit_count_at_nomination, announced_at
    ) VALUES (
        p_user_id, successor_candidate, new_parent,
        listline_rec.id, new_listline_id,
        user_rec.depositing_recruits_count, NOW()
    );

    INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
    VALUES (
        p_user_id, 'successor_nominated', 'successor_nomination', new_listline_id,
        jsonb_build_object('successor_id', successor_candidate, 'new_parent_id', new_parent)
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action_type VARCHAR(50),
    p_limit INTEGER,
    p_period_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    period_start TIMESTAMPTZ;
BEGIN
    period_start := date_trunc('hour', NOW() - (p_period_hours || ' hours')::interval);

    SELECT COALESCE(SUM(count), 0) INTO current_count
    FROM rate_limits
    WHERE user_id = p_user_id
      AND action_type = p_action_type
      AND rate_limits.period_start >= period_start;

    IF current_count >= p_limit THEN
        RETURN FALSE;
    END IF;

    INSERT INTO rate_limits (user_id, action_type, period_start, count)
    VALUES (p_user_id, p_action_type, date_trunc('hour', NOW()), 1)
    ON CONFLICT (user_id, action_type, period_start)
    DO UPDATE SET count = rate_limits.count + 1;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION detect_fraud_patterns(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    user_rec RECORD;
    signup_count INTEGER;
BEGIN
    SELECT * INTO user_rec FROM users WHERE id = p_user_id;

    IF user_rec.referrer_id IS NOT NULL THEN
        SELECT COUNT(*) INTO signup_count
        FROM users
        WHERE referrer_id = user_rec.referrer_id
          AND created_at > NOW() - INTERVAL '24 hours';

        IF signup_count > 10 THEN
            INSERT INTO fraud_flags (user_id, flag_type, severity, description, evidence)
            VALUES (
                user_rec.referrer_id, 'rapid_signups', 'high',
                'More than 10 signups in 24 hours',
                jsonb_build_object('count', signup_count, 'period', '24h')
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW v_user_earnings_summary AS
SELECT
    u.id, u.name, u.email, u.referral_code, u.balance,
    u.total_earnings, u.total_withdrawn,
    u.direct_recruits_count, u.depositing_recruits_count,
    u.successor_nominated,
    COALESCE(e.pending_earnings, 0) AS pending_earnings,
    COALESCE(e.cleared_earnings, 0) AS cleared_earnings,
    u.created_at
FROM users u
LEFT JOIN (
    SELECT
        user_id,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending_earnings,
        SUM(CASE WHEN status = 'cleared' THEN amount ELSE 0 END) AS cleared_earnings
    FROM earnings
    WHERE is_system_earning = FALSE
    GROUP BY user_id
) e ON e.user_id = u.id;

CREATE OR REPLACE VIEW v_system_stats AS
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
    (SELECT COUNT(*) FROM deposits WHERE status = 'cleared') AS total_deposits,
    (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'cleared') AS total_deposit_amount,
    (SELECT balance FROM system_account LIMIT 1) AS system_balance,
    (SELECT total_collected FROM system_account LIMIT 1) AS system_total_collected,
    (SELECT COALESCE(SUM(total_earnings), 0) FROM users) AS total_user_earnings,
    (SELECT COUNT(*) FROM successor_nominations) AS total_successor_nominations,
    (SELECT COUNT(*) FROM fraud_flags WHERE resolved = FALSE) AS unresolved_fraud_flags;

CREATE OR REPLACE VIEW v_listline_details AS
SELECT
    l.id AS listline_id, l.user_id, u4.name AS user_name,
    CASE WHEN l.position_1_is_system THEN 'SYSTEM' ELSE u1.name END AS position_1_name,
    CASE WHEN l.position_2_is_system THEN 'SYSTEM' ELSE u2.name END AS position_2_name,
    CASE WHEN l.position_3_is_system THEN 'SYSTEM' ELSE u3.name END AS position_3_name,
    u4.name AS position_4_name,
    l.is_successor_listline, l.created_at
FROM listlines l
JOIN users u4 ON l.position_4_user_id = u4.id
LEFT JOIN users u1 ON l.position_1_user_id = u1.id
LEFT JOIN users u2 ON l.position_2_user_id = u2.id
LEFT JOIN users u3 ON l.position_3_user_id = u3.id;

CREATE OR REPLACE VIEW v_referral_tree AS
WITH RECURSIVE tree AS (
    SELECT id, name, referrer_id, 0 AS depth, ARRAY[id] AS path, name::TEXT AS tree_path
    FROM users
    WHERE referrer_id IS NULL

    UNION ALL

    SELECT u.id, u.name, u.referrer_id, t.depth + 1, t.path || u.id, t.tree_path || ' → ' || u.name
    FROM users u
    INNER JOIN tree t ON u.referrer_id = t.id
    WHERE t.depth < 20
)
SELECT id, name, referrer_id, depth, tree_path,
    (SELECT COUNT(*) FROM users WHERE referrer_id = tree.id) AS direct_children
FROM tree
ORDER BY path;
