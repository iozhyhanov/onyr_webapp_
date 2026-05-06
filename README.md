```mermaid
flowchart TD
  subgraph USER["User"]
    A["1. Open web app\nlocalhost:5173"]
    I["9. View new claim in table\nDashboard stats updated"]
  end
  subgraph FE["Frontend · Vue.js"]
    B["2. Navigate to Create Claim\nVue Router · sidebar"]
    C["3. Fill in claim form\nName, DOB, contact, address…"]
    D["4. POST /api/claims\nJSON payload → API"]
    H["8. Dashboard updated\nRe-fetches GET /api/claims"]
  end
  subgraph BE["Backend · NestJS"]
    E["5. Process request\nValidates · transforms · logs"]
    F["6. Save to database\nINSERT claims table"]
    G["7. Return API response\n201 Created · claim object"]
  end
  subgraph DB["Database · PostgreSQL"]
    J["DB confirms save\nReturns new row / ID"]
  end
  A --> B --> C --> D
  B --> D
  D --> E --> F --> J --> G --> H
  H --> I