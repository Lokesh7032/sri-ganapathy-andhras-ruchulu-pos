# KR Catering Print Agent

Use this only when the POS server is not on the same LAN as the thermal printer, or when you want unattended LAN printing.

1. Create a printer in Admin > Printers.
2. Copy the generated `agentToken` into `.env`.
3. Configure the printer's LAN IP and port (usually 9100) in Admin.
4. Run `npm install` and `node index.js` on a computer on the same LAN as the printer.

The agent polls the server for queued jobs and sends generic ESC/POS bytes over TCP. Verify the exact printer model, encoding and cutter behavior before production rollout.
