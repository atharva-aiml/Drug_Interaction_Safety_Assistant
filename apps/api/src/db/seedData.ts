export interface SeedDrug {
  name: string;
  genericName: string;
  drugClass: string;
  dosageForm: string;
}

export interface SeedRelation {
  drugName: string;
  targetName: string;
  severity: string;
}

export const SEED_DRUGS: SeedDrug[] = [
  { name: "Warfarin", genericName: "warfarin sodium", drugClass: "Anticoagulant", dosageForm: "Tablet" },
  { name: "Aspirin", genericName: "acetylsalicylic acid", drugClass: "NSAID", dosageForm: "Tablet" },
  { name: "Ibuprofen", genericName: "ibuprofen", drugClass: "NSAID", dosageForm: "Tablet" },
  { name: "Naproxen", genericName: "naproxen sodium", drugClass: "NSAID", dosageForm: "Tablet" },
  { name: "Clopidogrel", genericName: "clopidogrel bisulfate", drugClass: "Antiplatelet", dosageForm: "Tablet" },
  { name: "Simvastatin", genericName: "simvastatin", drugClass: "Statin", dosageForm: "Tablet" },
  { name: "Atorvastatin", genericName: "atorvastatin calcium", drugClass: "Statin", dosageForm: "Tablet" },
  { name: "Amiodarone", genericName: "amiodarone hydrochloride", drugClass: "Antiarrhythmic", dosageForm: "Tablet" },
  { name: "Metformin", genericName: "metformin hydrochloride", drugClass: "Antidiabetic", dosageForm: "Tablet" },
  { name: "Glipizide", genericName: "glipizide", drugClass: "Antidiabetic", dosageForm: "Tablet" },
  { name: "Lisinopril", genericName: "lisinopril", drugClass: "ACE Inhibitor", dosageForm: "Tablet" },
  { name: "Losartan", genericName: "losartan potassium", drugClass: "ARB", dosageForm: "Tablet" },
  { name: "Spironolactone", genericName: "spironolactone", drugClass: "Diuretic", dosageForm: "Tablet" },
  { name: "Furosemide", genericName: "furosemide", drugClass: "Diuretic", dosageForm: "Tablet" },
  { name: "Hydrochlorothiazide", genericName: "hydrochlorothiazide", drugClass: "Diuretic", dosageForm: "Tablet" },
  { name: "Digoxin", genericName: "digoxin", drugClass: "Cardiac Glycoside", dosageForm: "Tablet" },
  { name: "Sertraline", genericName: "sertraline hydrochloride", drugClass: "SSRI", dosageForm: "Tablet" },
  { name: "Fluoxetine", genericName: "fluoxetine hydrochloride", drugClass: "SSRI", dosageForm: "Capsule" },
  { name: "Tramadol", genericName: "tramadol hydrochloride", drugClass: "Opioid Analgesic", dosageForm: "Tablet" },
  { name: "Amoxicillin", genericName: "amoxicillin", drugClass: "Penicillin Antibiotic", dosageForm: "Capsule" },
  { name: "Penicillin V", genericName: "penicillin V potassium", drugClass: "Penicillin Antibiotic", dosageForm: "Tablet" },
  { name: "Ciprofloxacin", genericName: "ciprofloxacin hydrochloride", drugClass: "Fluoroquinolone Antibiotic", dosageForm: "Tablet" },
  { name: "Azithromycin", genericName: "azithromycin", drugClass: "Macrolide Antibiotic", dosageForm: "Tablet" },
  { name: "Sulfamethoxazole-Trimethoprim", genericName: "sulfamethoxazole/trimethoprim", drugClass: "Sulfonamide Antibiotic", dosageForm: "Tablet" },
  { name: "Prednisone", genericName: "prednisone", drugClass: "Corticosteroid", dosageForm: "Tablet" },
  { name: "Omeprazole", genericName: "omeprazole", drugClass: "Proton Pump Inhibitor", dosageForm: "Capsule" },
  { name: "Levothyroxine", genericName: "levothyroxine sodium", drugClass: "Thyroid Hormone", dosageForm: "Tablet" },
  { name: "Methotrexate", genericName: "methotrexate", drugClass: "Antimetabolite", dosageForm: "Tablet" },
  { name: "Allopurinol", genericName: "allopurinol", drugClass: "Antigout", dosageForm: "Tablet" },
  { name: "Insulin Glargine", genericName: "insulin glargine", drugClass: "Insulin", dosageForm: "Injection" },
  { name: "Codeine", genericName: "codeine phosphate", drugClass: "Opioid Analgesic", dosageForm: "Tablet" },
  { name: "Diazepam", genericName: "diazepam", drugClass: "Benzodiazepine", dosageForm: "Tablet" },
  { name: "Phenytoin", genericName: "phenytoin sodium", drugClass: "Anticonvulsant", dosageForm: "Capsule" },
  { name: "Ondansetron", genericName: "ondansetron hydrochloride", drugClass: "Antiemetic", dosageForm: "Tablet" },
  { name: "Ketorolac", genericName: "ketorolac tromethamine", drugClass: "NSAID", dosageForm: "Injection" },
  { name: "Enalapril", genericName: "enalapril maleate", drugClass: "ACE Inhibitor", dosageForm: "Tablet" },
  { name: "Verapamil", genericName: "verapamil hydrochloride", drugClass: "Calcium Channel Blocker", dosageForm: "Tablet" },
  { name: "Rifampin", genericName: "rifampin", drugClass: "Antimycobacterial", dosageForm: "Capsule" }
];

export const SEED_ALLERGENS: string[] = [
  "NSAIDs",
  "Opioids",
  "Penicillin",
  "Macrolide",
  "Sulfa",
  "Latex"
];

export const SEED_DISEASES: string[] = [
  "Active Bleeding",
  "Pregnancy",
  "Peptic Ulcer Disease",
  "Renal Impairment",
  "Thyroid Disease",
  "Hyperkalemia",
  "Bipolar Disorder",
  "Diabetes",
  "Untreated Adrenal Insufficiency",
  "Liver Disease",
  "Respiratory Depression Risk",
  "Sleep Apnea",
  "Heart Failure"
];

export const SEED_INTERACTIONS: SeedRelation[] = [
  { drugName: "Warfarin", targetName: "Aspirin", severity: "severe" },
  { drugName: "Warfarin", targetName: "Ibuprofen", severity: "moderate" },
  { drugName: "Warfarin", targetName: "Amiodarone", severity: "severe" },
  { drugName: "Warfarin", targetName: "Fluoxetine", severity: "moderate" },
  { drugName: "Aspirin", targetName: "Clopidogrel", severity: "severe" },
  { drugName: "Aspirin", targetName: "Ibuprofen", severity: "minor" },
  { drugName: "Ibuprofen", targetName: "Lisinopril", severity: "moderate" },
  { drugName: "Ibuprofen", targetName: "Methotrexate", severity: "severe" },
  { drugName: "Clopidogrel", targetName: "Omeprazole", severity: "moderate" },
  { drugName: "Simvastatin", targetName: "Amiodarone", severity: "severe" },
  { drugName: "Simvastatin", targetName: "Verapamil", severity: "moderate" },
  { drugName: "Atorvastatin", targetName: "Clopidogrel", severity: "minor" },
  { drugName: "Amiodarone", targetName: "Digoxin", severity: "severe" },
  { drugName: "Metformin", targetName: "Furosemide", severity: "minor" },
  { drugName: "Metformin", targetName: "Insulin Glargine", severity: "moderate" },
  { drugName: "Lisinopril", targetName: "Spironolactone", severity: "severe" },
  { drugName: "Lisinopril", targetName: "Losartan", severity: "severe" },
  { drugName: "Spironolactone", targetName: "Furosemide", severity: "minor" },
  { drugName: "Furosemide", targetName: "Digoxin", severity: "moderate" },
  { drugName: "Digoxin", targetName: "Verapamil", severity: "moderate" },
  { drugName: "Sertraline", targetName: "Tramadol", severity: "severe" },
  { drugName: "Sertraline", targetName: "Fluoxetine", severity: "moderate" },
  { drugName: "Fluoxetine", targetName: "Tramadol", severity: "severe" },
  { drugName: "Tramadol", targetName: "Codeine", severity: "moderate" },
  { drugName: "Ciprofloxacin", targetName: "Warfarin", severity: "severe" },
  { drugName: "Azithromycin", targetName: "Warfarin", severity: "moderate" },
  { drugName: "Sulfamethoxazole-Trimethoprim", targetName: "Methotrexate", severity: "contraindicated" },
  { drugName: "Levothyroxine", targetName: "Rifampin", severity: "moderate" },
  { drugName: "Allopurinol", targetName: "Warfarin", severity: "minor" },
  { drugName: "Codeine", targetName: "Diazepam", severity: "contraindicated" },
  { drugName: "Phenytoin", targetName: "Warfarin", severity: "moderate" },
  { drugName: "Ketorolac", targetName: "Warfarin", severity: "severe" },
  { drugName: "Ketorolac", targetName: "Aspirin", severity: "severe" },
  { drugName: "Enalapril", targetName: "Spironolactone", severity: "severe" },
  { drugName: "Enalapril", targetName: "Losartan", severity: "severe" },
  { drugName: "Rifampin", targetName: "Warfarin", severity: "contraindicated" }
];

export const SEED_ALLERGY_LINKS: SeedRelation[] = [
  { drugName: "Aspirin", targetName: "NSAIDs", severity: "moderate" },
  { drugName: "Ibuprofen", targetName: "NSAIDs", severity: "moderate" },
  { drugName: "Naproxen", targetName: "NSAIDs", severity: "moderate" },
  { drugName: "Tramadol", targetName: "Opioids", severity: "minor" },
  { drugName: "Amoxicillin", targetName: "Penicillin", severity: "severe" },
  { drugName: "Penicillin V", targetName: "Penicillin", severity: "contraindicated" },
  { drugName: "Azithromycin", targetName: "Macrolide", severity: "minor" },
  { drugName: "Sulfamethoxazole-Trimethoprim", targetName: "Sulfa", severity: "severe" },
  { drugName: "Insulin Glargine", targetName: "Latex", severity: "minor" },
  { drugName: "Codeine", targetName: "Opioids", severity: "moderate" },
  { drugName: "Ketorolac", targetName: "NSAIDs", severity: "severe" }
];

export const SEED_CONTRAINDICATIONS: SeedRelation[] = [
  { drugName: "Warfarin", targetName: "Active Bleeding", severity: "contraindicated" },
  { drugName: "Warfarin", targetName: "Pregnancy", severity: "contraindicated" },
  { drugName: "Ibuprofen", targetName: "Peptic Ulcer Disease", severity: "severe" },
  { drugName: "Ibuprofen", targetName: "Renal Impairment", severity: "moderate" },
  { drugName: "Naproxen", targetName: "Peptic Ulcer Disease", severity: "moderate" },
  { drugName: "Amiodarone", targetName: "Thyroid Disease", severity: "severe" },
  { drugName: "Metformin", targetName: "Renal Impairment", severity: "severe" },
  { drugName: "Lisinopril", targetName: "Pregnancy", severity: "contraindicated" },
  { drugName: "Losartan", targetName: "Pregnancy", severity: "contraindicated" },
  { drugName: "Spironolactone", targetName: "Hyperkalemia", severity: "severe" },
  { drugName: "Digoxin", targetName: "Renal Impairment", severity: "moderate" },
  { drugName: "Sertraline", targetName: "Bipolar Disorder", severity: "moderate" },
  { drugName: "Fluoxetine", targetName: "Bipolar Disorder", severity: "moderate" },
  { drugName: "Prednisone", targetName: "Peptic Ulcer Disease", severity: "moderate" },
  { drugName: "Prednisone", targetName: "Diabetes", severity: "minor" },
  { drugName: "Levothyroxine", targetName: "Untreated Adrenal Insufficiency", severity: "severe" },
  { drugName: "Methotrexate", targetName: "Pregnancy", severity: "contraindicated" },
  { drugName: "Methotrexate", targetName: "Liver Disease", severity: "severe" },
  { drugName: "Allopurinol", targetName: "Renal Impairment", severity: "minor" },
  { drugName: "Codeine", targetName: "Respiratory Depression Risk", severity: "severe" },
  { drugName: "Diazepam", targetName: "Sleep Apnea", severity: "severe" },
  { drugName: "Phenytoin", targetName: "Pregnancy", severity: "moderate" },
  { drugName: "Ketorolac", targetName: "Peptic Ulcer Disease", severity: "contraindicated" },
  { drugName: "Enalapril", targetName: "Pregnancy", severity: "contraindicated" },
  { drugName: "Verapamil", targetName: "Heart Failure", severity: "severe" },
  { drugName: "Rifampin", targetName: "Liver Disease", severity: "moderate" }
];