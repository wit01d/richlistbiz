package models

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type UserStatus string

const (
	UserStatusPending    UserStatus = "pending"
	UserStatusActive     UserStatus = "active"
	UserStatusSuspended  UserStatus = "suspended"
	UserStatusTerminated UserStatus = "terminated"
)

type DepositStatus string

const (
	DepositStatusPending     DepositStatus = "pending"
	DepositStatusVerified    DepositStatus = "verified"
	DepositStatusCleared     DepositStatus = "cleared"
	DepositStatusRefunded    DepositStatus = "refunded"
	DepositStatusChargedback DepositStatus = "chargedback"
)

type WithdrawalStatus string

const (
	WithdrawalStatusPending    WithdrawalStatus = "pending"
	WithdrawalStatusProcessing WithdrawalStatus = "processing"
	WithdrawalStatusCompleted  WithdrawalStatus = "completed"
	WithdrawalStatusRejected   WithdrawalStatus = "rejected"
)

type EarningType string

const (
	EarningTypeDeposit   EarningType = "deposit"
	EarningTypeSuccessor EarningType = "successor"
)

type FlagSeverity string

const (
	FlagSeverityLow      FlagSeverity = "low"
	FlagSeverityMedium   FlagSeverity = "medium"
	FlagSeverityHigh     FlagSeverity = "high"
	FlagSeverityCritical FlagSeverity = "critical"
)

// Keycloak JWT Claims
type KeycloakClaims struct {
	Sub               string                 `json:"sub"`
	Email             string                 `json:"email"`
	EmailVerified     bool                   `json:"email_verified"`
	Name              string                 `json:"name"`
	PreferredUsername string                 `json:"preferred_username"`
	GivenName         string                 `json:"given_name"`
	FamilyName        string                 `json:"family_name"`
	RealmAccess       RealmAccess            `json:"realm_access"`
	ResourceAccess    map[string]RoleAccess  `json:"resource_access"`
	Azp               string                 `json:"azp"`
	Iss               string                 `json:"iss"`
	Aud               interface{}            `json:"aud"`
	Exp               int64                  `json:"exp"`
	Iat               int64                  `json:"iat"`
}

type RealmAccess struct {
	Roles []string `json:"roles"`
}

type RoleAccess struct {
	Roles []string `json:"roles"`
}

func (c *KeycloakClaims) HasRole(role string) bool {
	for _, r := range c.RealmAccess.Roles {
		if r == role {
			return true
		}
	}
	return false
}

func (c *KeycloakClaims) IsAdmin() bool {
	return c.HasRole("admin") || c.HasRole("realm-admin")
}

func (c *KeycloakClaims) GetDisplayName() string {
	if c.Name != "" {
		return c.Name
	}
	if c.GivenName != "" && c.FamilyName != "" {
		return c.GivenName + " " + c.FamilyName
	}
	if c.PreferredUsername != "" {
		return c.PreferredUsername
	}
	return c.Email
}

type User struct {
	ID                      uuid.UUID       `json:"id"`
	KeycloakID              string          `json:"keycloak_id"`
	Email                   string          `json:"email"`
	Name                    string          `json:"name"`
	ReferralCode            string          `json:"referral_code"`
	ReferrerID              *uuid.UUID      `json:"referrer_id,omitempty"`
	Status                  UserStatus      `json:"status"`
	KYCVerified             bool            `json:"kyc_verified"`
	KYCVerifiedAt           *time.Time      `json:"kyc_verified_at,omitempty"`
	Balance                 float64         `json:"balance"`
	TotalEarnings           float64         `json:"total_earnings"`
	TotalWithdrawn          float64         `json:"total_withdrawn"`
	DirectRecruitsCount     int             `json:"direct_recruits_count"`
	DepositingRecruitsCount int             `json:"depositing_recruits_count"`
	SuccessorNominated      bool            `json:"successor_nominated"`
	SuccessorID             *uuid.UUID      `json:"successor_id,omitempty"`
	LastLoginAt             *time.Time      `json:"last_login_at,omitempty"`
	LastActivityAt          *time.Time      `json:"last_activity_at,omitempty"`
	Metadata                json.RawMessage `json:"metadata,omitempty"`
	CreatedAt               time.Time       `json:"created_at"`
	UpdatedAt               time.Time       `json:"updated_at"`
}

type SystemAccount struct {
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	Balance        float64   `json:"balance"`
	TotalCollected float64   `json:"total_collected"`
	CreatedAt      time.Time `json:"created_at"`
}

type ReferralLink struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	Code      string     `json:"code"`
	IsActive  bool       `json:"is_active"`
	UsesCount int        `json:"uses_count"`
	MaxUses   *int       `json:"max_uses,omitempty"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

type Listline struct {
	ID                  uuid.UUID  `json:"id"`
	UserID              uuid.UUID  `json:"user_id"`
	Position1UserID     *uuid.UUID `json:"position_1_user_id,omitempty"`
	Position1IsSystem   bool       `json:"position_1_is_system"`
	Position2UserID     *uuid.UUID `json:"position_2_user_id,omitempty"`
	Position2IsSystem   bool       `json:"position_2_is_system"`
	Position3UserID     *uuid.UUID `json:"position_3_user_id,omitempty"`
	Position3IsSystem   bool       `json:"position_3_is_system"`
	Position4UserID     uuid.UUID  `json:"position_4_user_id"`
	IsSuccessorListline bool       `json:"is_successor_listline"`
	OriginalReferrerID  *uuid.UUID `json:"original_referrer_id,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
}

type Deposit struct {
	ID                uuid.UUID       `json:"id"`
	UserID            uuid.UUID       `json:"user_id"`
	Amount            float64         `json:"amount"`
	Currency          string          `json:"currency"`
	Status            DepositStatus   `json:"status"`
	PaymentProcessor  sql.NullString  `json:"payment_processor,omitempty"`
	PaymentReference  sql.NullString  `json:"payment_reference,omitempty"`
	ListlineID        *uuid.UUID      `json:"listline_id,omitempty"`
	RecipientUserID   *uuid.UUID      `json:"recipient_user_id,omitempty"`
	RecipientIsSystem bool            `json:"recipient_is_system"`
	ClearedAt         *time.Time      `json:"cleared_at,omitempty"`
	RefundedAt        *time.Time      `json:"refunded_at,omitempty"`
	ChargebackAt      *time.Time      `json:"chargeback_at,omitempty"`
	Metadata          json.RawMessage `json:"metadata,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

type Earning struct {
	ID              uuid.UUID     `json:"id"`
	UserID          *uuid.UUID    `json:"user_id,omitempty"`
	IsSystemEarning bool          `json:"is_system_earning"`
	Amount          float64       `json:"amount"`
	EarningType     EarningType   `json:"earning_type"`
	SourceUserID    uuid.UUID     `json:"source_user_id"`
	DepositID       *uuid.UUID    `json:"deposit_id,omitempty"`
	Status          DepositStatus `json:"status"`
	VerifiedAt      *time.Time    `json:"verified_at,omitempty"`
	ClearedAt       *time.Time    `json:"cleared_at,omitempty"`
	CreatedAt       time.Time     `json:"created_at"`
}

type SuccessorNomination struct {
	ID                       uuid.UUID  `json:"id"`
	NominatorID              uuid.UUID  `json:"nominator_id"`
	SuccessorID              uuid.UUID  `json:"successor_id"`
	NewParentID              uuid.UUID  `json:"new_parent_id"`
	OriginalListlineID       *uuid.UUID `json:"original_listline_id,omitempty"`
	SuccessorListlineID      *uuid.UUID `json:"successor_listline_id,omitempty"`
	DepositCountAtNomination int        `json:"deposit_count_at_nomination"`
	NominationYear           int        `json:"nomination_year"`
	AnnouncedAt              *time.Time `json:"announced_at,omitempty"`
	ConfirmedAt              *time.Time `json:"confirmed_at,omitempty"`
	CreatedAt                time.Time  `json:"created_at"`
}

type Withdrawal struct {
	ID             uuid.UUID        `json:"id"`
	UserID         uuid.UUID        `json:"user_id"`
	Amount         float64          `json:"amount"`
	Currency       string           `json:"currency"`
	Status         WithdrawalStatus `json:"status"`
	PaymentMethod  sql.NullString   `json:"payment_method,omitempty"`
	PaymentDetails json.RawMessage  `json:"payment_details,omitempty"`
	ProcessedAt    *time.Time       `json:"processed_at,omitempty"`
	RejectedReason sql.NullString   `json:"rejected_reason,omitempty"`
	CreatedAt      time.Time        `json:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at"`
}

type FraudFlag struct {
	ID              uuid.UUID       `json:"id"`
	UserID          *uuid.UUID      `json:"user_id,omitempty"`
	FlagType        string          `json:"flag_type"`
	Severity        FlagSeverity    `json:"severity"`
	Description     sql.NullString  `json:"description,omitempty"`
	Evidence        json.RawMessage `json:"evidence,omitempty"`
	Resolved        bool            `json:"resolved"`
	ResolvedAt      *time.Time      `json:"resolved_at,omitempty"`
	ResolvedBy      *uuid.UUID      `json:"resolved_by,omitempty"`
	ResolutionNotes sql.NullString  `json:"resolution_notes,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
}

type AuditLog struct {
	ID         uuid.UUID       `json:"id"`
	UserID     *uuid.UUID      `json:"user_id,omitempty"`
	Action     string          `json:"action"`
	EntityType sql.NullString  `json:"entity_type,omitempty"`
	EntityID   *uuid.UUID      `json:"entity_id,omitempty"`
	OldValues  json.RawMessage `json:"old_values,omitempty"`
	NewValues  json.RawMessage `json:"new_values,omitempty"`
	IPAddress  sql.NullString  `json:"ip_address,omitempty"`
	UserAgent  sql.NullString  `json:"user_agent,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}

// API Response types

type UserProfile struct {
	ID                      uuid.UUID  `json:"id"`
	Email                   string     `json:"email"`
	Name                    string     `json:"name"`
	ReferralCode            string     `json:"referral_code"`
	Status                  UserStatus `json:"status"`
	KYCVerified             bool       `json:"kyc_verified"`
	Balance                 float64    `json:"balance"`
	TotalEarnings           float64    `json:"total_earnings"`
	TotalWithdrawn          float64    `json:"total_withdrawn"`
	DirectRecruitsCount     int        `json:"direct_recruits_count"`
	DepositingRecruitsCount int        `json:"depositing_recruits_count"`
	SuccessorNominated      bool       `json:"successor_nominated"`
	CreatedAt               time.Time  `json:"created_at"`
}

type ListlineStats struct {
	Position1Count             int     `json:"position1Count"`
	Position2Count             int     `json:"position2Count"`
	Position3Count             int     `json:"position3Count"`
	Position4Count             int     `json:"position4Count"`
	TotalEarningsFromPosition1 float64 `json:"totalEarningsFromPosition1"`
}

type ReferralInfo struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Date     string `json:"date"`
	Paid     bool   `json:"paid"`
}

type PaymentInfo struct {
	ID        string  `json:"id"`
	From      string  `json:"from"`
	Amount    float64 `json:"amount"`
	NetAmount float64 `json:"netAmount"`
	Date      string  `json:"date"`
}

type DashboardData struct {
	Username      string        `json:"username"`
	ReferralCode  string        `json:"referralCode"`
	ListlineStats ListlineStats `json:"listlineStats"`
	Upline        []string      `json:"upline"`
	Referrals     []ReferralInfo    `json:"referrals"`
	Payments      []PaymentInfo     `json:"payments"`
}

type ListlineDetail struct {
	Position int    `json:"position"`
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	IsSystem bool   `json:"is_system"`
}

type SystemStats struct {
	TotalUsers                int     `json:"total_users"`
	ActiveUsers               int     `json:"active_users"`
	TotalDeposits             int     `json:"total_deposits"`
	TotalDepositAmount        float64 `json:"total_deposit_amount"`
	SystemBalance             float64 `json:"system_balance"`
	SystemTotalCollected      float64 `json:"system_total_collected"`
	TotalUserEarnings         float64 `json:"total_user_earnings"`
	TotalSuccessorNominations int     `json:"total_successor_nominations"`
	UnresolvedFraudFlags      int     `json:"unresolved_fraud_flags"`
}

type RegisterRequest struct {
	ReferralCode string `json:"referral_code"`
}

type WithdrawalRequest struct {
	Amount        float64 `json:"amount"`
	PaymentMethod string  `json:"payment_method"`
}

type DepositRequest struct {
	SuccessURL string `json:"success_url,omitempty"`
	CancelURL  string `json:"cancel_url,omitempty"`
}

type ValidationResult struct {
	Valid      bool       `json:"valid"`
	ReferrerID *uuid.UUID `json:"referrer_id,omitempty"`
	Reason     string     `json:"reason,omitempty"`
}
