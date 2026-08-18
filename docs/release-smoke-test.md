# Release Smoke Test Checklist

Use this checklist before sharing a build with the wider team.

## Build Artifacts
- macOS: install from `release/Inventory Manager POS-0.0.0-mac-arm64.dmg` or unzip `release/Inventory Manager POS-0.0.0-mac-arm64.zip`.
- Windows x64: install from `release/Inventory Manager POS-0.0.0-win-x64.exe`.
- Windows ARM64: install from `release/Inventory Manager POS-0.0.0-win-arm64.exe` after running `npm run dist:win:arm64`.

## Local App Flow
- Launch the packaged app and confirm the login screen appears.
- Log in with the owner PIN and confirm Dashboard loads.
- Add one brand/category and one product with SKU, price, wholesale price, and stock.
- Search the product in Inventory and POS.
- Scan or manually enter the SKU into POS.
- Complete one cash sale and verify stock decreases.
- Reprint the receipt from Sales History.
- Process one refund and confirm stock is restored.
- Process one exchange where the replacement costs more and confirm the amount due is recorded.
- Add, edit, and delete a test customer.
- Add a cashier user, log out, log in as cashier, and confirm restricted settings are hidden.
- Open Reports and confirm sales, product, brand, tax, staff, print, and export views render.
- Open Settings > Database and verify no destructive action is run during smoke testing.

## Cloud Sync Flow
- In Supabase SQL Editor, run the SQL from Settings > Cloud Sync.
- Create at least two pilot stores in `stores`, for example `store-a` and `store-b`.
- Create Supabase Auth users for the pilot team and add matching rows in `store_members`.
- Use only a publishable or anon key in the app. Never paste a service-role key into the desktop app.
- Save the Supabase URL and key, then activate Store A with a Supabase Auth user that belongs to Store A.
- Run Test Connection and confirm the app reports a connected, activated store.
- Create or edit one product, one customer, and one sale on Store A.
- Click Sync Now and confirm Pending Sync Items returns to zero.
- Verify Supabase tables contain Store A rows for `products`, `customers`, `orders`, and `order_items`.
- Activate Store B on a second test machine or clean local profile, then repeat a small product/customer/sale flow.
- Confirm Store A data and Store B data remain isolated by `store_id` in Supabase and in each app's local screens.
- Temporarily disconnect the network, make one edit, reconnect, click Sync Now, and confirm failed queue items retry successfully.

## External Pilot Assets
- Supabase production or pilot project URL.
- Supabase publishable or anon key for the desktop app.
- Supabase Auth users for every pilot admin or owner.
- Pilot `store_id` values and store names to seed into `stores` and `store_members`.
- Target barcode scanner model and receipt printer model.
- At least one target macOS machine and one target Windows x64 machine.
- macOS signing/notarization status and Windows code-signing status for the build being shared.

## Known Release Notes
- macOS artifacts are ad-hoc signed and not notarized, so Gatekeeper may warn on first open.
- The current build still reports a Vite chunk-size warning because the POS app is bundled as a large desktop renderer. This is not a release blocker for the desktop installer.
- Hardware behavior must be verified with the actual barcode scanner, receipt printer, and target shop machines.
- Cloud sync is required for the multi-store pilot and now requires store activation with Supabase Auth membership before any queued data is uploaded.
