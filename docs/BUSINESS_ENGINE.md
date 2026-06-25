# MilkBox Business Engine

## Purpose

MilkBox Business Engine is a reusable operating system for appointment-based businesses.

The salon template is the first vertical, but the core platform must remain reusable for:

- salons
- barbers
- beauty clinics
- physiotherapists
- dentists
- veterinary practices
- personal trainers
- other booking-heavy service businesses

## Core product idea

We are not building a simple booking app.

We are building a decision engine that helps the business answer:

> Can we confidently accept this booking, deliver the service, remember the client history, and protect profit?

## Core engines

### 1. Client Engine

Stores the business memory around each customer.

This includes:

- client profile
- contact details
- visit history
- notes
- photos
- preferences
- allergies or risk notes
- service history
- payments and spend history

### 2. Service Engine

Defines what the business sells.

Each service can have:

- duration
- base price
- estimated cost
- recipe or resource requirements
- included quantity
- optional extras
- profitability rules

### 3. Booking Engine

Decides whether a request can become an appointment.

It checks:

- client profile
- service duration
- stylist or staff availability
- appointment phases
- resource availability
- stock confidence
- WhatsApp service window
- human approval requirements

### 4. Connect Engine

Handles external communication channels.

Initial focus:

- WhatsApp Business Platform

Future channels:

- SMS
- email
- Telegram
- website chat

MilkBox Connect must be reusable. The salon app must not own the WhatsApp integration.

### 5. Stock / Resource Engine

Tracks the ability to deliver services.

Important principle:

> Stock is not only inventory. Stock is service confidence.

For salons, this means the system should know whether the business can safely perform root tint, highlights, balayage, blow dry, treatments, or extension services.

### 6. Business Intelligence Engine

Answers business-owner questions.

Examples:

- Which services made money today?
- Which services ran late?
- Which clients spend the most?
- What must be ordered this week?
- Which products are close to running out?
- Which bookings need attention?

## Architecture rules

1. Build modular engines, not one giant app.
2. Keep WhatsApp as a standalone connector.
3. Client Profile is the center of the business memory.
4. Visits are the permanent history record.
5. Appointments are planned events; visits are what actually happened.
6. Services define expected work; visits record actual work.
7. AI may suggest, but early MVP must require human approval before sending or booking.
8. Every feature must build successfully before moving to the next feature.

## Salon template lesson

Nick Ashley confirmed that the strongest salon hook is not only appointments.

The hook is:

> A digital client card that replaces paper cards, remembers what was done last time, supports photos and notes, and helps with stock control.

This becomes the first proof of the MilkBox Business Engine model.
