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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT balance_non_negative CHECK (balance >= 0),
    CONSTRAINT total_earnings_non_negative CHECK (total_earnings >= 0),
    CONSTRAINT counter_bounds CHECK (
        direct_recruits_count >= 0 AND direct_recruits_count < 1000000 AND
        depositing_recruits_count >= 0 AND depositing_recruits_count < 1000000
    )
);

INSERT INTO users (
    id, email, name, password_hash, referral_code, referrer_id, status, kyc_verified
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system@internal.local',
    'SYSTEM',
    'SYSTEM_NO_LOGIN_DISABLED',
    'SYSTEM',
    NULL,
    'active',
    TRUE
);

CREATE TABLE system_account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    balance DECIMAL(12, 2) DEFAULT 0.00,
    total_collected DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_system_account_singleton ON system_account((TRUE));

INSERT INTO system_account (name) VALUES ('SYSTEM');

CREATE TABLE referral_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    uses_count INTEGER DEFAULT 0,
    max_uses INTEGER,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_deposit_amount CHECK (amount = 10.00)
);

CREATE TABLE earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_system_earning BOOLEAN DEFAULT FALSE,
    amount DECIMAL(12, 2) NOT NULL,
    earning_type earning_type NOT NULL,
    source_user_id UUID NOT NULL REFERENCES users(id),
    deposit_id UUID REFERENCES deposits(id),
    status deposit_status DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    cleared_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT earnings_user_or_system CHECK (user_id IS NOT NULL OR is_system_earning = TRUE)
);

CREATE TABLE successor_nominations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nominator_id UUID NOT NULL REFERENCES users(id),
    successor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    new_parent_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    original_listline_id UUID REFERENCES listlines(id),
    successor_listline_id UUID REFERENCES listlines(id),
    deposit_count_at_nomination INTEGER NOT NULL,
    nomination_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM created_at)::INTEGER) STORED,
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
CREATE INDEX idx_users_successor ON users(successor_id) WHERE successor_id IS NOT NULL;
CREATE INDEX idx_users_kyc_withdrawal ON users(id) WHERE kyc_verified = TRUE AND status = 'active';
CREATE INDEX idx_users_active ON users(id) WHERE status = 'active';
CREATE INDEX idx_users_active_kyc ON users(id) WHERE status = 'active' AND kyc_verified = TRUE;

CREATE INDEX idx_referral_links_user ON referral_links(user_id);
CREATE INDEX idx_referral_links_code ON referral_links(code);
CREATE INDEX idx_referral_links_active ON referral_links(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_referral_links_valid ON referral_links(code, is_active, expires_at) WHERE is_active = TRUE;

CREATE INDEX idx_listlines_user ON listlines(user_id);
CREATE INDEX idx_listlines_position_1 ON listlines(position_1_user_id);
CREATE INDEX idx_listlines_successor ON listlines(is_successor_listline) WHERE is_successor_listline = TRUE;

CREATE INDEX idx_deposits_user ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_deposits_recipient ON deposits(recipient_user_id);
CREATE INDEX idx_deposits_created_at ON deposits(created_at DESC);
CREATE INDEX idx_deposits_cleared_recipient ON deposits(recipient_user_id, status) WHERE status = 'cleared' AND recipient_is_system = FALSE;
CREATE INDEX idx_deposits_user_status ON deposits(user_id, status);
CREATE INDEX idx_deposits_status_cleared ON deposits(status, created_at DESC) WHERE status = 'cleared';

CREATE INDEX idx_earnings_user ON earnings(user_id);
CREATE INDEX idx_earnings_source ON earnings(source_user_id);
CREATE INDEX idx_earnings_status ON earnings(status);
CREATE INDEX idx_earnings_type ON earnings(earning_type);

CREATE INDEX idx_successor_nominations_nominator ON successor_nominations(nominator_id);
CREATE INDEX idx_successor_nominations_successor ON successor_nominations(successor_id);
CREATE INDEX idx_successor_nominations_year ON successor_nominations(nominator_id, nomination_year);

CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_pending_cooling ON withdrawals(user_id, created_at) WHERE status = 'pending';

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

CREATE OR REPLACE FUNCTION detect_circular_referral(p_new_user_id UUID, p_referrer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    found_cycle BOOLEAN := FALSE;
BEGIN
    WITH RECURSIVE upline AS (
        SELECT id, referrer_id, 1 AS depth, ARRAY[id] AS path
        FROM users
        WHERE id = p_referrer_id

        UNION ALL

        SELECT u.id, u.referrer_id, up.depth + 1, up.path || u.id
        FROM users u
        INNER JOIN upline up ON u.id = up.referrer_id
        WHERE up.depth < 100
          AND NOT u.id = ANY(up.path)
    )
    SELECT EXISTS (
        SELECT 1 FROM upline WHERE id = p_new_user_id
    ) INTO found_cycle;

    IF NOT found_cycle THEN
        WITH RECURSIVE downline AS (
            SELECT id, 1 AS depth, ARRAY[id] AS path
            FROM users
            WHERE referrer_id = p_new_user_id

            UNION ALL

            SELECT u.id, d.depth + 1, d.path || u.id
            FROM users u
            INNER JOIN downline d ON u.referrer_id = d.id
            WHERE d.depth < 100
              AND NOT u.id = ANY(d.path)
        )
        SELECT EXISTS (
            SELECT 1 FROM downline WHERE id = p_referrer_id
        ) INTO found_cycle;
    END IF;

    RETURN found_cycle;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_referral_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referrer_id IS NOT NULL AND NEW.id != '00000000-0000-0000-0000-000000000000' THEN
        IF detect_circular_referral(NEW.id, NEW.referrer_id) THEN
            RAISE EXCEPTION 'Circular referral detected';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_check_circular_referral
    BEFORE INSERT OR UPDATE OF referrer_id ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_referral_integrity();

CREATE OR REPLACE FUNCTION validate_referral_link(p_code VARCHAR)
RETURNS TABLE(valid BOOLEAN, referrer_id UUID, reason TEXT) AS $$
DECLARE
    link_rec RECORD;
BEGIN
    IF p_code = 'SYSTEM' THEN
        RETURN QUERY SELECT TRUE, '00000000-0000-0000-0000-000000000000'::UUID, NULL::TEXT;
        RETURN;
    END IF;

    SELECT rl.*, u.status AS user_status, u.kyc_verified AS user_kyc_verified
    INTO link_rec
    FROM referral_links rl
    JOIN users u ON u.id = rl.user_id
    WHERE rl.code = p_code;

    IF link_rec IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid referral code';
        RETURN;
    END IF;

    IF NOT link_rec.is_active THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Referral link is inactive';
        RETURN;
    END IF;

    IF link_rec.expires_at IS NOT NULL AND link_rec.expires_at < NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Referral link has expired';
        RETURN;
    END IF;

    IF link_rec.max_uses IS NOT NULL AND link_rec.uses_count >= link_rec.max_uses THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Referral link has reached maximum uses';
        RETURN;
    END IF;

    IF link_rec.user_status != 'active' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Referrer account is not active';
        RETURN;
    END IF;

    IF NOT link_rec.user_kyc_verified THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Referrer has not completed KYC verification';
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, link_rec.user_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_withdrawal(p_user_id UUID, p_amount DECIMAL)
RETURNS TABLE(valid BOOLEAN, reason TEXT) AS $$
DECLARE
    user_rec RECORD;
BEGIN
    SELECT * INTO user_rec FROM users WHERE id = p_user_id;

    IF user_rec IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User not found';
        RETURN;
    END IF;

    IF user_rec.status != 'active' THEN
        RETURN QUERY SELECT FALSE, 'Account is not active';
        RETURN;
    END IF;

    IF NOT user_rec.kyc_verified THEN
        RETURN QUERY SELECT FALSE, 'KYC verification required';
        RETURN;
    END IF;

    IF user_rec.created_at > NOW() - INTERVAL '30 days' THEN
        RETURN QUERY SELECT FALSE, 'Account must be at least 30 days old';
        RETURN;
    END IF;

    IF user_rec.last_login_at IS NULL OR user_rec.last_login_at < NOW() - INTERVAL '7 days' THEN
        RETURN QUERY SELECT FALSE, 'Must have logged in within the past 7 days';
        RETURN;
    END IF;

    IF p_amount > user_rec.balance THEN
        RETURN QUERY SELECT FALSE, 'Insufficient balance';
        RETURN;
    END IF;

    IF p_amount < 10.00 THEN
        RETURN QUERY SELECT FALSE, 'Minimum withdrawal is €10';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM withdrawals
        WHERE user_id = p_user_id
          AND status = 'pending'
          AND created_at > NOW() - INTERVAL '48 hours'
    ) THEN
        RETURN QUERY SELECT FALSE, '48-hour cooling period between withdrawals';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM fraud_flags
        WHERE user_id = p_user_id
          AND resolved = FALSE
          AND severity IN ('high', 'critical')
    ) THEN
        RETURN QUERY SELECT FALSE, 'Account under fraud review';
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
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
    system_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    SELECT ARRAY_AGG(uc.user_id ORDER BY uc.level)
    INTO upline_arr
    FROM get_upline_chain(p_user_id, 4) uc;

    position_4_user_id := p_user_id;

    IF array_length(upline_arr, 1) >= 2 THEN
        position_3_user_id := upline_arr[2];
        position_3_is_system := (upline_arr[2] = system_id);
    ELSE
        position_3_user_id := system_id;
        position_3_is_system := TRUE;
    END IF;

    IF array_length(upline_arr, 1) >= 3 THEN
        position_2_user_id := upline_arr[3];
        position_2_is_system := (upline_arr[3] = system_id);
    ELSE
        position_2_user_id := system_id;
        position_2_is_system := TRUE;
    END IF;

    IF array_length(upline_arr, 1) >= 4 THEN
        position_1_user_id := upline_arr[4];
        position_1_is_system := (upline_arr[4] = system_id);
    ELSE
        position_1_user_id := system_id;
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
    PERFORM pg_advisory_xact_lock(hashtext('deposit_' || NEW.user_id::text));

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
        PERFORM pg_advisory_xact_lock(hashtext('system_account'));

        UPDATE system_account
        SET balance = balance + NEW.amount,
            total_collected = total_collected + NEW.amount;

        INSERT INTO earnings (is_system_earning, amount, earning_type, source_user_id, deposit_id, status)
        VALUES (TRUE, NEW.amount, 'deposit', NEW.user_id, NEW.id, NEW.status);
    ELSE
        PERFORM pg_advisory_xact_lock(hashtext(listline_rec.position_1_user_id::text));

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
    IF NEW.status = 'cleared' AND (OLD.status IS NULL OR OLD.status NOT IN ('cleared', 'verified')) THEN
        SELECT referrer_id INTO referrer FROM users WHERE id = NEW.user_id;

        IF referrer IS NOT NULL THEN
            PERFORM pg_advisory_xact_lock(hashtext('recruits_' || referrer::text));

            UPDATE users
            SET depositing_recruits_count = depositing_recruits_count + 1
            WHERE id = referrer;

            PERFORM check_successor_eligibility(referrer);
        END IF;

        IF NOT NEW.recipient_is_system AND NEW.recipient_user_id IS NOT NULL THEN
            PERFORM pg_advisory_xact_lock(hashtext(NEW.recipient_user_id::text));

            UPDATE users
            SET balance = balance + NEW.amount,
                total_earnings = total_earnings + NEW.amount
            WHERE id = NEW.recipient_user_id;
        END IF;

        UPDATE earnings
        SET status = 'cleared', cleared_at = NOW()
        WHERE deposit_id = NEW.id;
    END IF;

    IF NEW.status = 'chargedback' AND OLD.status = 'cleared' THEN
        SELECT referrer_id INTO referrer FROM users WHERE id = NEW.user_id;

        IF referrer IS NOT NULL THEN
            PERFORM pg_advisory_xact_lock(hashtext('recruits_' || referrer::text));

            UPDATE users
            SET depositing_recruits_count = GREATEST(0, depositing_recruits_count - 1)
            WHERE id = referrer;
        END IF;

        IF NEW.recipient_is_system THEN
            PERFORM pg_advisory_xact_lock(hashtext('system_account'));

            UPDATE system_account
            SET balance = balance - NEW.amount;
        ELSIF NEW.recipient_user_id IS NOT NULL THEN
            PERFORM pg_advisory_xact_lock(hashtext(NEW.recipient_user_id::text));

            UPDATE users
            SET balance = GREATEST(0, balance - NEW.amount),
                total_earnings = GREATEST(0, total_earnings - NEW.amount)
            WHERE id = NEW.recipient_user_id;
        END IF;

        UPDATE earnings
        SET status = 'chargedback'
        WHERE deposit_id = NEW.id;

        INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (
            NEW.user_id, 'deposit_chargedback', 'deposit', NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status, 'amount', NEW.amount)
        );

        NEW.chargeback_at = NOW();
    END IF;

    IF NEW.status = 'refunded' AND OLD.status IN ('pending', 'verified') THEN
        IF NEW.recipient_is_system THEN
            PERFORM pg_advisory_xact_lock(hashtext('system_account'));

            UPDATE system_account
            SET balance = balance - NEW.amount,
                total_collected = total_collected - NEW.amount;
        END IF;

        UPDATE earnings
        SET status = 'refunded'
        WHERE deposit_id = NEW.id;

        INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (
            NEW.user_id, 'deposit_refunded', 'deposit', NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status, 'amount', NEW.amount)
        );

        NEW.refunded_at = NOW();
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
    yearly_count INTEGER;
BEGIN
    SELECT * INTO user_rec FROM users WHERE id = p_user_id;

    IF user_rec.successor_nominated OR user_rec.depositing_recruits_count < 13 THEN
        RETURN;
    END IF;

    SELECT COUNT(*) INTO yearly_count
    FROM successor_nominations
    WHERE nominator_id = p_user_id
      AND nomination_year = EXTRACT(YEAR FROM NOW());

    IF yearly_count >= 3 THEN
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

    WITH ranked_recruits AS (
        SELECT
            u.id,
            d.created_at AS deposit_cleared_at,
            ROW_NUMBER() OVER (ORDER BY d.created_at ASC) AS deposit_order
        FROM users u
        JOIN deposits d ON d.user_id = u.id
        WHERE u.referrer_id = p_user_id
          AND d.status = 'cleared'
    ),
    additional_three AS (
        SELECT id
        FROM ranked_recruits
        WHERE deposit_order >= 11 AND deposit_order <= 13
    )
    SELECT id INTO successor_candidate
    FROM additional_three
    ORDER BY random()
    LIMIT 1;

    IF successor_candidate IS NULL THEN
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('successor_' || p_user_id::text));

    SELECT successor_nominated INTO user_rec FROM users WHERE id = p_user_id FOR UPDATE;
    IF user_rec.successor_nominated THEN
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
    UPDATE users SET direct_recruits_count = GREATEST(0, direct_recruits_count - 1) WHERE id = p_user_id;

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
        jsonb_build_object(
            'successor_id', successor_candidate,
            'new_parent_id', new_parent,
            'deposit_count', user_rec.depositing_recruits_count
        )
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
    ip_pattern_count INTEGER;
    email_pattern_count INTEGER;
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
            )
            ON CONFLICT DO NOTHING;
        END IF;

        SELECT COUNT(*) INTO ip_pattern_count
        FROM audit_log al1
        JOIN audit_log al2 ON al1.ip_address = al2.ip_address
        WHERE al1.user_id = p_user_id
          AND al2.user_id != p_user_id
          AND al1.action = 'user_created'
          AND al2.action = 'user_created'
          AND al1.created_at > NOW() - INTERVAL '7 days'
          AND al2.created_at > NOW() - INTERVAL '7 days';

        IF ip_pattern_count > 3 THEN
            INSERT INTO fraud_flags (user_id, flag_type, severity, description, evidence)
            VALUES (
                p_user_id, 'shared_ip', 'medium',
                'Multiple accounts from same IP address',
                jsonb_build_object('shared_count', ip_pattern_count, 'period', '7d')
            )
            ON CONFLICT DO NOTHING;
        END IF;

        WITH email_parts AS (
            SELECT
                p_user_id AS check_user_id,
                SPLIT_PART(user_rec.email, '@', 1) AS local_part,
                SPLIT_PART(user_rec.email, '@', 2) AS domain
        ),
        similar_emails AS (
            SELECT COUNT(*) AS cnt
            FROM users u, email_parts ep
            WHERE u.id != ep.check_user_id
              AND SPLIT_PART(u.email, '@', 2) = ep.domain
              AND similarity(SPLIT_PART(u.email, '@', 1), ep.local_part) > 0.7
              AND u.created_at > NOW() - INTERVAL '30 days'
        )
        SELECT cnt INTO email_pattern_count FROM similar_emails;

        IF email_pattern_count > 2 THEN
            INSERT INTO fraud_flags (user_id, flag_type, severity, description, evidence)
            VALUES (
                p_user_id, 'similar_email_pattern', 'medium',
                'Email similar to other recent signups',
                jsonb_build_object('similar_count', email_pattern_count)
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_verify_earnings()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    verified_count INTEGER := 0;
    cleared_count INTEGER := 0;
BEGIN
    WITH verified AS (
        UPDATE earnings
        SET status = 'verified', verified_at = NOW()
        WHERE status = 'pending'
          AND created_at < NOW() - INTERVAL '14 days'
        RETURNING 1
    )
    SELECT COUNT(*) INTO verified_count FROM verified;

    WITH cleared AS (
        UPDATE earnings
        SET status = 'cleared', cleared_at = NOW()
        WHERE status = 'verified'
          AND verified_at IS NOT NULL
          AND verified_at < NOW() - INTERVAL '16 days'
        RETURNING 1
    )
    SELECT COUNT(*) INTO cleared_count FROM cleared;

    WITH legacy_cleared AS (
        UPDATE earnings
        SET status = 'cleared', cleared_at = NOW()
        WHERE status = 'verified'
          AND verified_at IS NULL
          AND created_at < NOW() - INTERVAL '30 days'
        RETURNING 1
    )
    SELECT cleared_count + COUNT(*) INTO cleared_count FROM legacy_cleared;

    updated_count := verified_count + cleared_count;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_referral_links()
RETURNS INTEGER AS $$
DECLARE
    deactivated_count INTEGER;
BEGIN
    WITH deactivated AS (
        UPDATE referral_links
        SET is_active = FALSE
        WHERE is_active = TRUE
          AND expires_at < NOW()
        RETURNING 1
    )
    SELECT COUNT(*) INTO deactivated_count FROM deactivated;

    RETURN deactivated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM rate_limits
        WHERE period_start < NOW() - INTERVAL '7 days'
        RETURNING 1
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION run_scheduled_cleanup()
RETURNS TABLE(
    expired_links INTEGER,
    old_rate_limits INTEGER,
    verified_earnings INTEGER
) AS $$
DECLARE
    v_expired_links INTEGER;
    v_old_rate_limits INTEGER;
    v_verified_earnings INTEGER;
BEGIN
    SELECT cleanup_expired_referral_links() INTO v_expired_links;
    SELECT cleanup_old_rate_limits() INTO v_old_rate_limits;
    SELECT auto_verify_earnings() INTO v_verified_earnings;

    INSERT INTO audit_log (action, entity_type, new_values)
    VALUES (
        'scheduled_cleanup', 'system',
        jsonb_build_object(
            'expired_links', v_expired_links,
            'old_rate_limits', v_old_rate_limits,
            'verified_earnings', v_verified_earnings,
            'run_at', NOW()
        )
    );

    RETURN QUERY SELECT v_expired_links, v_old_rate_limits, v_verified_earnings;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'deposits' THEN
        UPDATE users SET last_activity_at = NOW() WHERE id = NEW.user_id;
    ELSIF TG_TABLE_NAME = 'withdrawals' THEN
        UPDATE users SET last_activity_at = NOW() WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deposits_update_activity
    AFTER INSERT ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_user_activity();

CREATE TRIGGER withdrawals_update_activity
    AFTER INSERT ON withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_user_activity();

CREATE OR REPLACE VIEW v_user_earnings_summary AS
SELECT
    u.id, u.name, u.email, u.referral_code, u.balance,
    u.total_earnings, u.total_withdrawn,
    u.direct_recruits_count, u.depositing_recruits_count,
    u.successor_nominated,
    COALESCE(e.pending_earnings, 0) AS pending_earnings,
    COALESCE(e.verified_earnings, 0) AS verified_earnings,
    COALESCE(e.cleared_earnings, 0) AS cleared_earnings,
    u.created_at
FROM users u
LEFT JOIN (
    SELECT
        user_id,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending_earnings,
        SUM(CASE WHEN status = 'verified' THEN amount ELSE 0 END) AS verified_earnings,
        SUM(CASE WHEN status = 'cleared' THEN amount ELSE 0 END) AS cleared_earnings
    FROM earnings
    WHERE is_system_earning = FALSE
    GROUP BY user_id
) e ON e.user_id = u.id
WHERE u.id != '00000000-0000-0000-0000-000000000000';

CREATE OR REPLACE VIEW v_system_stats AS
SELECT
    (SELECT COUNT(*) FROM users WHERE id != '00000000-0000-0000-0000-000000000000') AS total_users,
    (SELECT COUNT(*) FROM users WHERE status = 'active' AND id != '00000000-0000-0000-0000-000000000000') AS active_users,
    (SELECT COUNT(*) FROM deposits WHERE status = 'cleared') AS total_deposits,
    (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'cleared') AS total_deposit_amount,
    (SELECT balance FROM system_account LIMIT 1) AS system_balance,
    (SELECT total_collected FROM system_account LIMIT 1) AS system_total_collected,
    (SELECT COALESCE(SUM(total_earnings), 0) FROM users WHERE id != '00000000-0000-0000-0000-000000000000') AS total_user_earnings,
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
    SELECT
        id,
        name,
        referrer_id,
        0 AS depth,
        ARRAY[id] AS path,
        name::TEXT AS tree_path
    FROM users
    WHERE referrer_id IS NULL
      AND id != '00000000-0000-0000-0000-000000000000'

    UNION ALL

    SELECT
        u.id,
        u.name,
        u.referrer_id,
        t.depth + 1,
        t.path || u.id,
        t.tree_path || ' → ' || u.name
    FROM users u
    INNER JOIN tree t ON u.referrer_id = t.id
    WHERE t.depth < 10
      AND NOT u.id = ANY(t.path)
)
SELECT
    id,
    name,
    referrer_id,
    depth,
    tree_path,
    (SELECT COUNT(*) FROM users WHERE referrer_id = tree.id) AS direct_children
FROM tree
ORDER BY path;

CREATE OR REPLACE VIEW v_withdrawal_eligibility AS
SELECT
    u.id,
    u.name,
    u.email,
    u.balance,
    u.kyc_verified,
    u.status,
    u.created_at,
    u.last_login_at,
    u.created_at <= NOW() - INTERVAL '30 days' AS account_age_ok,
    COALESCE(u.last_login_at >= NOW() - INTERVAL '7 days', FALSE) AS activity_ok,
    NOT EXISTS (
        SELECT 1 FROM withdrawals w
        WHERE w.user_id = u.id
          AND w.status = 'pending'
          AND w.created_at > NOW() - INTERVAL '48 hours'
    ) AS cooling_period_ok,
    NOT EXISTS (
        SELECT 1 FROM fraud_flags f
        WHERE f.user_id = u.id
          AND f.resolved = FALSE
          AND f.severity IN ('high', 'critical')
    ) AS no_fraud_flags,
    (
        u.status = 'active'
        AND u.kyc_verified
        AND u.created_at <= NOW() - INTERVAL '30 days'
        AND (u.last_login_at IS NOT NULL AND u.last_login_at >= NOW() - INTERVAL '7 days')
        AND u.balance >= 10.00
        AND NOT EXISTS (
            SELECT 1 FROM withdrawals w
            WHERE w.user_id = u.id
              AND w.status = 'pending'
              AND w.created_at > NOW() - INTERVAL '48 hours'
        )
        AND NOT EXISTS (
            SELECT 1 FROM fraud_flags f
            WHERE f.user_id = u.id
              AND f.resolved = FALSE
              AND f.severity IN ('high', 'critical')
        )
    ) AS can_withdraw
FROM users u
WHERE u.id != '00000000-0000-0000-0000-000000000000';

CREATE MATERIALIZED VIEW mv_referral_tree AS
SELECT * FROM v_referral_tree;

CREATE UNIQUE INDEX idx_mv_referral_tree_id ON mv_referral_tree(id);
CREATE INDEX idx_mv_referral_tree_depth ON mv_referral_tree(depth);

CREATE OR REPLACE FUNCTION refresh_referral_tree()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_referral_tree;
END;
$$ LANGUAGE plpgsql;
