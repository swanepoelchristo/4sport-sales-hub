# MilkBox Business Engine Database Model

## Design principle

The database must separate planned work from actual work.

- Appointment = what was booked or requested.
- Consultation = professional assessment and decision-making.
- Visit = what actually happened.
- Visit Service = the services performed during that visit.
- Visit Recipe = the products, formulas, quantities, ratios, and notes used.
- Stock Movement = inventory impact caused by the visit or stock process.

## Core entities

## 1. business_profiles

Represents each business using the platform.

Suggested fields:

- id
- business_name
- business_type
- owner_name
- phone
- email
- timezone
- default_currency
- created_at
- updated_at

## 2. staff_profiles

Represents stylists or service providers.

Suggested fields:

- id
- business_id
- auth_user_id
- full_name
- phone
- email
- role
- active
- default_working_hours
- created_at
- updated_at

## 3. client_profiles

The main customer record.

Suggested fields:

- id
- business_id
- first_name
- last_name
- mobile
- email
- birthday
- preferred_staff_id
- hair_type
- hair_density
- hair_porosity
- scalp_notes
- allergy_notes
- general_notes
- source
- created_at
- updated_at

## 4. client_card_imports

Stores paper-card migration events.

Suggested fields:

- id
- business_id
- client_id
- uploaded_by
- source_image_url
- extraction_status
- extracted_json
- human_reviewed
- reviewed_by
- reviewed_at
- created_at

Rule:

AI-extracted data may not become official truth until reviewed by a human.

## 5. services

Defines what the business sells.

Suggested fields:

- id
- business_id
- name
- category
- description
- base_duration_minutes
- base_price
- estimated_cost
- active
- requires_consultation
- created_at
- updated_at

## 6. service_recipes

Defines expected products/resources used by a service.

Suggested fields:

- id
- business_id
- service_id
- product_id
- planned_quantity
- included_quantity
- unit
- ratio
- extra_charge_amount
- extra_charge_unit
- notes

Example:

Root tint grey coverage:

- colour 50 to 80 g
- activator ratio 1:1.5
- developer 20 volume

Highlights:

- bleach powder 30 g
- activator 60 g
- ratio 1:2

## 7. appointments

Represents booked or requested time.

Suggested fields:

- id
- business_id
- client_id
- staff_id
- booking_source
- requested_service_text
- appointment_type
- status
- start_at
- end_at
- estimated_duration_minutes
- late_fee_applies
- cancellation_fee_applies
- notes
- created_at
- updated_at

Important:

Appointments should not be treated as the final truth of what happened.

## 8. appointment_phases

Allows appointments to have phases.

Suggested fields:

- id
- appointment_id
- phase_name
- start_at
- end_at
- staff_required
- client_waiting
- notes

Example salon colour appointment:

- application
- processing
- wash
- cut
- blow dry

This allows the booking engine to understand that a stylist may be able to do other work while colour processes.

## 9. consultations

Professional assessment before/during service.

Suggested fields:

- id
- business_id
- client_id
- appointment_id
- staff_id
- desired_outcome
- reference_photo_urls
- current_colour_notes
- previous_colour_notes
- scalp_condition
- hair_condition
- service_risk_level
- consultation_notes
- approved_plan
- created_at
- updated_at

## 10. visits

The permanent record of what actually happened.

Suggested fields:

- id
- business_id
- client_id
- appointment_id
- consultation_id
- staff_id
- started_at
- finished_at
- actual_duration_minutes
- before_photo_urls
- after_photo_urls
- client_feedback
- visit_notes
- created_at
- updated_at

## 11. visit_services

Services actually performed during a visit.

Suggested fields:

- id
- visit_id
- service_id
- service_name_snapshot
- price_charged
- discount_amount
- notes

## 12. visit_recipes

Actual formula or products used.

Suggested fields:

- id
- visit_service_id
- product_id
- product_name_snapshot
- quantity_used
- unit
- ratio
- developer_volume
- processing_time_minutes
- variance_reason
- notes

## 13. products

Tracks stock items.

Suggested fields:

- id
- business_id
- name
- category
- brand
- unit
- cost_per_unit
- reorder_level
- supplier_id
- active
- created_at
- updated_at

## 14. stock_movements

Tracks stock usage, adjustment, purchase, and correction.

Suggested fields:

- id
- business_id
- product_id
- movement_type
- related_visit_recipe_id
- quantity
- unit
- reason
- created_by
- created_at

Movement types:

- purchase
- usage
- adjustment
- waste
- correction
- transfer

## 15. weekly_stock_checks

Supports salon weekly ordering workflow.

Suggested fields:

- id
- business_id
- checked_by
- week_start
- week_end
- status
- notes
- created_at

## 16. weekly_stock_check_items

Suggested fields:

- id
- weekly_stock_check_id
- product_id
- expected_quantity
- actual_quantity
- suggested_order_quantity
- notes

## 17. conversations

Communication thread abstraction.

Suggested fields:

- id
- business_id
- client_id
- channel
- external_thread_id
- status
- created_at
- updated_at

Channels:

- whatsapp
- sms
- email
- manual

## 18. conversation_messages

Individual messages.

Suggested fields:

- id
- conversation_id
- direction
- sender
- message_text
- media_url
- message_type
- service_window_expires_at
- ai_intent
- ai_confidence
- created_at

## 19. ai_action_drafts

AI suggestions waiting for approval.

Suggested fields:

- id
- business_id
- conversation_message_id
- action_type
- draft_text
- suggested_payload
- confidence
- status
- approved_by
- approved_at
- created_at

Action types:

- reply
- create_appointment
- create_booking_request
- escalate_to_staff
- update_client_profile

## Relationships

client_profiles have many:

- appointments
- consultations
- visits
- conversations
- client_card_imports

visits have many:

- visit_services

visit_services have many:

- visit_recipes

visit_recipes may create:

- stock_movements

appointments may have:

- appointment_phases
- consultation
- visit

## MVP implementation order

1. business_profiles
2. staff_profiles
3. client_profiles
4. services
5. appointments
6. visits
7. visit_services
8. visit_recipes
9. products
10. stock_movements
11. conversations
12. conversation_messages
13. ai_action_drafts
14. client_card_imports

## RLS principle

Every business record must be scoped by business_id.

No production table should be publicly writable.

Authenticated users should only access data for businesses they belong to.
