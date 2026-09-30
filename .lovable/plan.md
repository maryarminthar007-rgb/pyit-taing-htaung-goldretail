# Site-wide UK Date Format

## Changes
- Add one shared date utility for converting stored ISO dates to `dd/mm/yyyy`, parsing valid `dd/mm/yyyy` input, and producing local “today” values without UTC date drift.
- Add a reusable Shadcn calendar date field that displays and accepts `dd/mm/yyyy`, with an explicit format hint and touch-friendly calendar selection.
- Replace every user-facing native date input with the shared date field while continuing to save database dates in the existing ISO `yyyy-mm-dd` format.
- Replace raw ISO date strings and inconsistent locale formatting in all tables, cards, histories, profiles, work status, order books, gemstone records, and marketing order views with the shared formatter.
- Keep date comparisons and database sorting on ISO values so overdue rules and chronological ordering remain reliable.

## Verification
- Add focused tests for formatting, parsing, invalid dates, leap years, and ISO timestamps.
- Check the main Order Book and Marketing forms at tablet width, including typed dates and calendar selection.
- Search the application again to confirm no user-visible native date inputs or raw ISO date displays remain.
