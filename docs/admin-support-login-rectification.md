# Admin login rectification

Correct access model:

- Marianne: `info@4sport.co.za`, role `admin`, full access.
- Christo: `support@4sport.co.za`, role `admin`, full access.
- Sales reps: role `sales_rep`, limited to their own pipeline.
- Call centre agents: role `call_center_agent`, limited to call-centre workflows.

Implementation notes:

1. Use the existing `admin` role for both back-office users.
2. Do not add a separate operational role for Christo.
3. Keep sales reps and call-centre agents on their existing limited access paths.
