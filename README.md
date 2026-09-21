# Pyit Taing Htaung Ledger

Create a comprehensive Goldsmith and Order Management Web Application for "Pyit Taing Htaung Gold Retail". The system needs a clean, modern, and user-friendly dashboard interface. 

Here are the core features and requirements:

1. Goldsmith (ပန်းထိမ်ဆရာ) Management:

- Ability to add, edit, and view Goldsmith Profiles (Photo, Name, Phone Number, Address).

- Multi-book Support: Each goldsmith can have multiple active order books (e.g., Maung Maung Book 1, Maung Maung Book 2) to track different batches or periods.

2. Product Catalog:

- View and add item types with Photos and Names (e.g., Rings, Bracelets, Chains).

3. Order & Calculation Book (The core ledger logic):

Inside each Goldsmith's Book, there must be a table/form containing the following fields:

- Issue Date (ပေးရက်စွဲ)

- Ordered Quantity (ခိုင်းခုရေ)

- Issued Item Name (ပေးအမျိုးအမည်)

- Gold Quality/Standard (e.g., 15 ပဲရည်)

- Specifications/Measurements (e.g., လက်တိုင်း 18 မှ 25 ထိ)

- Issued Weight in Grams (ပေး Gram)

- Return Due Date (အပ်ရက်စွဲ)

- Returned Quantity (အပ်ခုရေ)

- Returned Item Name (အပ်အမျိုးအမည်)

- Returned Weight in Grams (အပ် Gram)

- Goldsmith Wastage Allowance (ပန်းထိမ်ဆရာအလျော့တွက်)

- Fire/Water Loss (မီးကင်လျော့ / ရေကင်လျော့)

- Due Gold / Owed Gold (လိုရွှေ) - *Automated calculation*

- Excess Gold (ပိုရွှေ) - *Automated calculation*

- Total Due Gold (Total လိုရွှေ) - *Accumulated balance*

- Total Excess Gold (Total ပိုရွှေ) - *Accumulated balance*

4. Automated Calculation Logic:

- Formulas: Total Weight Accounted For = Returned Weight + Wastage Allowance + Fire/Water Loss.

- If (Issued Weight > Total Weight Accounted For), the difference goes to "Due Gold (လိုရွှေ)".

- If (Issued Weight < Total Weight Accounted For), the difference goes to "Excess Gold (ပိုရွှေ)".

- Balance Forwarding (အကြွေးသယ်ယူခြင်း): The "Total Due Gold" must automatically accumulate across multiple orders for that specific goldsmith's book. For example: If order #1 has 3 grams due, the next order's due gold must add to this 3 grams, unless the goldsmith returns/settles it in the next transaction.

5. UI/UX Design:

- Myanmar language support or bilingual (English/Myanmar) for labels.

- A Dashboard overview showing Total Outstanding Gold (စုစုပေါင်း လိုရွှေ) across all goldsmiths.

- Clean data tables with search and filter functions (filter by Goldsmith Name or Book).

- Use a premium gold and professional dark/light theme fitting for a Gold Retail business.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pyit-taing-htaung-goldretail.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0e6d183a-c63b-4825-a96a-f0936c06f67c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
