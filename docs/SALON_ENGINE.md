# Salon Engine Blueprint

## Purpose

The salon template proves the MilkBox Business Engine model.

The product should help a stylist run the day while keeping client history, service decisions, booking confidence, and stock control under control.

## Core salon insight

Nick Ashley confirmed:

- new clients require consultation
- desired colour may change after seeing the hair
- service time can change due to previous colour, scalp condition, density, hair type, and client honesty
- the client card is the most important record
- before and after photos help, but people forget to take them
- stock control is the magic-wand feature

## Product position

Do not position the salon template as only a cheaper Booksy or Fresha.

Position it as:

> AI receptionist + digital client cards + service memory + stock-aware booking assistant.

## Digital client card

The digital client card is the salon memory.

It should include:

- client contact details
- consultation history
- hair type
- hair density
- porosity
- scalp condition
- allergy notes
- previous colour history
- previous formulas
- developer volume
- processing times
- before and after photos
- retail products purchased
- what the client paid last time
- stylist notes

## Paper card migration

Many salons still use paper cards.

The migration hook:

> Take a photo of the old paper client card, let AI extract it, then let the stylist confirm before saving.

Rule:

AI extraction must always be reviewed by a human before becoming official data.

## Consultation workflow

A new colour client should not be booked directly into a final treatment without risk checks.

The consultation should capture:

- desired outcome
- reference photos
- current hair condition
- previous colour history
- scalp condition
- hair density
- hair type
- technical risk
- feasibility notes
- recommended plan

Important:

The system must allow the plan to change before, during, or after consultation.

## Booking workflow

The AI receptionist should collect enough information to create a safe booking request.

For colour-related services, ask:

- Is your hair short, medium, or long?
- Are you looking for roots, full tint, highlights, balayage, or a consultation?
- Is this a new colour or same as last time?
- Have you coloured your hair recently?

For returning clients:

- find the client by phone number
- load last visit
- load last formula
- suggest based on history

## Appointment phases

Salon work is not one solid block of time.

Example colour appointment:

- consultation
- application
- processing
- wash
- cut
- blow dry
- finish

During processing, the stylist may be able to do:

- consultation
- another colour application
- cut
- blow dry

The calendar must eventually understand appointment phases, not only start/end time.

## Service examples from Nick Ashley

### Durations

- Ladies cut only: 45 to 60 minutes
- Cut and blow: 60 minutes
- Gents cut: 45 minutes
- Blow dry: 45 to 60 minutes
- Root touch-up: 15 minutes application, 30 minutes processing
- Full tint: 30 minutes application, 30 to 40 minutes processing
- Highlights: 30 to 60 minutes application, 30 to 40 minutes processing
- Extension removal: 15 to 30 minutes
- Extension re-application: 30 to 40 minutes

### Colour recipes

Root tint / grey coverage:

- 50 to 80 g colour
- ratio 1:1.5
- example: 20 g colour + 30 g activator
- 20 volume activator

Highlights:

- ratio 1:2
- example: 30 g bleach powder + 60 g activator
- volume can vary: 5, 10, 20, 30, or 40 volume

Balayage:

- ratio 1:2 or 1:3
- example: 10 g powder + 30 g activator
- volume varies by hair and desired result

## Stock control philosophy

Do not force stylists to weigh every gram during the appointment.

Use grams for:

- planning
- recipes
- costing
- end-of-day or weekly stock checks
- profitability reports

The stylist should only be asked for extra data when something unusual happened.

Example:

- normal usage
- used a little extra
- used a lot extra
- colour correction / unusual case

## Weekly stock assistant

Nick Ashley confirmed salons often check stock weekly.

The system should eventually:

- estimate product usage from visits
- compare to actual stock check
- suggest order quantities
- highlight products not to run out of
- show service capacity from stock

Critical products:

- basin shampoo
- conditioner
- colour
- bleach powder
- activators / developers
- treatment products
- extension stock where relevant

## Photo reminders

Nick Ashley confirmed before and after photos help, but not everyone remembers.

Feature:

When finishing a visit, prompt:

> Did you take before and after photos?

Options:

- Take before photo
- Take after photo
- Skip with reason

## Late and cancellation rules

Nick Ashley mentioned clients arriving late and service changes as major causes of schedule problems.

The system should support:

- late arrival flag
- cancellation fee
- late fee
- service changed during consultation
- appointment ran over time
- reason codes for delays

## MVP build order

1. Database blueprint
2. Supabase schema
3. Seed salon data
4. Client profiles
5. Client visits
6. Services and recipes
7. Digital client card import flow
8. Booking decision engine
9. Weekly stock assistant
10. WhatsApp connector integration

## Product hook

The first sales message to salons should be:

> Turn your paper client cards into cloud client cards, then let the AI receptionist use that history to help book clients, remember formulas, and prevent stock surprises.
