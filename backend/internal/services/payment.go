package services

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/stripe/stripe-go/v81/webhook"

	"richlistbiz/internal/models"
	"richlistbiz/internal/repository"
)

type PaymentService struct {
	depositRepo     *repository.DepositRepository
	successURL      string
	cancelURL       string
	webhookSecret   string
}

func NewPaymentService(
	depositRepo *repository.DepositRepository,
	stripeSecretKey string,
	successURL string,
	cancelURL string,
	webhookSecret string,
) *PaymentService {
	stripe.Key = stripeSecretKey
	return &PaymentService{
		depositRepo:   depositRepo,
		successURL:    successURL,
		cancelURL:     cancelURL,
		webhookSecret: webhookSecret,
	}
}

func (s *PaymentService) CreateCheckoutSession(ctx context.Context, userID uuid.UUID, userEmail string, customSuccessURL, customCancelURL string) (string, error) {
	successURL := s.successURL
	if customSuccessURL != "" {
		successURL = customSuccessURL
	}

	cancelURL := s.cancelURL
	if customCancelURL != "" {
		cancelURL = customCancelURL
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card", "ideal", "bancontact", "sepa_debit"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("eur"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String("RichList.biz Membership"),
						Description: stripe.String("One-time membership fee to join RichList.biz"),
					},
					UnitAmount: stripe.Int64(1000),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(successURL + "&session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(cancelURL),
		CustomerEmail: stripe.String(userEmail),
		Metadata: map[string]string{
			"user_id": userID.String(),
		},
		PaymentIntentData: &stripe.CheckoutSessionPaymentIntentDataParams{
			Metadata: map[string]string{
				"user_id": userID.String(),
			},
		},
	}

	sess, err := session.New(params)
	if err != nil {
		return "", fmt.Errorf("failed to create checkout session: %w", err)
	}

	_, err = s.depositRepo.Create(ctx, userID, "stripe", sess.ID)
	if err != nil {
		return "", fmt.Errorf("failed to create deposit record: %w", err)
	}

	return sess.URL, nil
}

func (s *PaymentService) HandleWebhook(payload []byte, signature string) error {
	event, err := webhook.ConstructEvent(payload, signature, s.webhookSecret)
	if err != nil {
		return fmt.Errorf("failed to verify webhook signature: %w", err)
	}

	ctx := context.Background()

	switch event.Type {
	case "checkout.session.completed":
		var sess stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
			return fmt.Errorf("failed to unmarshal session: %w", err)
		}

		deposit, err := s.depositRepo.GetByPaymentReference(ctx, sess.ID)
		if err != nil {
			return fmt.Errorf("failed to get deposit: %w", err)
		}
		if deposit == nil {
			return fmt.Errorf("deposit not found for session %s", sess.ID)
		}

		if err := s.depositRepo.UpdateStatus(ctx, deposit.ID, models.DepositStatusVerified); err != nil {
			return fmt.Errorf("failed to update deposit status: %w", err)
		}

	case "payment_intent.succeeded":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
			return fmt.Errorf("failed to unmarshal payment intent: %w", err)
		}

	case "charge.dispute.created":
		var dispute stripe.Dispute
		if err := json.Unmarshal(event.Data.Raw, &dispute); err != nil {
			return fmt.Errorf("failed to unmarshal dispute: %w", err)
		}

	case "charge.refunded":
		var charge stripe.Charge
		if err := json.Unmarshal(event.Data.Raw, &charge); err != nil {
			return fmt.Errorf("failed to unmarshal charge: %w", err)
		}
	}

	return nil
}

func (s *PaymentService) GetUserDeposits(ctx context.Context, userID uuid.UUID) ([]models.Deposit, error) {
	return s.depositRepo.GetByUserID(ctx, userID)
}

func (s *PaymentService) HasPaidDeposit(ctx context.Context, userID uuid.UUID) (bool, error) {
	return s.depositRepo.HasClearedDeposit(ctx, userID)
}

func (s *PaymentService) ClearDeposit(ctx context.Context, depositID uuid.UUID) error {
	return s.depositRepo.UpdateStatus(ctx, depositID, models.DepositStatusCleared)
}
