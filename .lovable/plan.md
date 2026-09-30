# Order Book Balance and Header Fix

## Changes
- Remove Scrap Gold from every order balance calculation; keep it stored and displayed only as reference information.
- Rework the running book balance as one signed net: previous balance + Due − Excess, then expose only the remaining Due or remaining Excess.
- Use the same shared calculation everywhere so the Order Book, goldsmith profile, dashboard, deposits, and risk summaries agree.
- Replace the two large summary cards with one compact, side-by-side balance bar above the ledger.
- Clarify in the return form that Scrap Gold is informational and already included in Returned Weight.

## Verification
- Add focused calculation tests covering scrap-gold neutrality and Due/Excess cancellation in both directions.
- Check the Order Book at tablet width and confirm the compact header and table fit cleanly.
