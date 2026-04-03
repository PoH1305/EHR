# Research Title: Secure Digital Health Record System with Decentralized AI-Driven Consent and Immutable Auditing

---

## **I. Abstract**
**Abstract**—Electronic Health Records (EHRs) are now essential to the storage and exchange of patient data. Yet the prevailing security model—static Role Based Access Control (RBAC)—is structurally too broad for the deeply personal nature of healthcare. It does not account for patient wishes, does not adapt over time, and gives patients little visibility into who is accessing their records and why. 

This paper presents a secure digital health record system built around a dynamic, consent-driven access layer that sits on top of traditional RBAC. The system moves beyond centralized institutional storage to a **Local-First Decentralized Architecture**, where the patient is the sole owner of their clinical data via a personal device node. We introduce a **Server-Blinded Relay** for zero-knowledge data sharing and a **Client-Side AI Minimization module** that automatically redacts sensitive categories (psychiatric, genetic, reproductive) at the edge before synchronization. The system incorporates **AES-256 GCM encryption**, absolute transparency via a **Blockchain-inspired immutable audit trail**, and an **AI-based monitoring module** utilizing **Isolation Forests** to flag anomalous access patterns in real time. Experimental results confirm that the system restores patient autonomy and ensures regulatory compliance (GDPR, DPDP, HIPAA) while preserving the operational agility of clinical workflows.

---

## **II. Introduction**
Consider a patient admitted to a hospital late at night following a road accident. Within minutes, the attending physician pulls up a complete medical history—blood type, allergies, current medications, and prior surgeries—without making a single phone call. In this critical moment, the promise of Electronic Health Records (EHRs) is fulfilled. 

But consider what happens in the days that follow: a billing clerk retrieves the same record to process an insurance claim; a nurse on a different ward opens it out of curiosity; a visiting consultant accesses it without the patient’s knowledge; and nowhere in this chain does the patient receive any notification, hold any control, or retain any visibility. The system that saved the patient’s life that first night has, by the second day, become a system they cannot see into, cannot govern, and cannot trust. This tension between the undeniable clinical value of shared health data and the equally undeniable failure to protect patient privacy and autonomy is the central problem this paper addresses.

---

## **III. Problem Statement: The Limitations of RBAC**
The dominant security model in healthcare remains **Role-Based Access Control (RBAC)**, which assigns permissions to job roles rather than to individual patient relationships. This model is fundamentally too broad:
*   **Structural Over-Extensivity**: A "Cardiologist" role grants access to all cardiac records in a system, regardless of a past care relationship.
*   **Coarse Consent Mechanisms**: Consent is typically a broad, one-time form signed at admission, offering no mechanism for a patient to say: "Grant access only to my cardiologist, only to my cardiac records, only until the end of this consultation."
*   **Lack of Transparency**: Audit logs are maintained for institutional compliance and are not surfaced to patients in a meaningful, verifiable form.
*   **Passive Monitoring**: Anomalous access patterns (e.g., bulk downloads at unusual hours) often go undetected until significant harm has occurred.
*   **Regulatory Exposure**: Emerging regulations like GDPR (EU), DPDP (India), and HIPAA (USA) increasingly mandate that patients have the right to know how data is used and to withdraw consent—capabilities RBAC alone cannot provide.

---

## **IV. The Proposed EHI System Architecture**
Our proposed system addresses these interconnected failures by shifting the authoritative node from the institution to the patient.

### **1. Local-First / Decentralized Clinical Node**
Records are stored locally on the patient's device using **IndexedDB (Dexie.js)**. This ensures that the patient is the primary owner and authoritative source of their data, eliminating "Single Points of Failure" and institutional data silos.

### **2. Relationship-Based Access (RelBAC) via Consent Tokens**
We replace broad institutional consent with granular, relationship-based authorization. Patients issue **Consent Tokens** that are:
*   **Granular**: Approving specific clinical categories (Vitals, Lab Reports, etc.).
*   **Time-Bound**: Enforced by a cryptographically signed TTL (Time-To-Live).
*   **Purpose-Specific**: Tying access to a specific intent (e.g., "Second Opinion" or "Insurance Claim").

### **3. Zero-Knowledge / Server-Blinded Handshake**
Data sharing occurs via a **Server-Blinded Relay**. The central server facilitates the "handshake" between patient and provider nodes but never possesses the decryption keys for the clinical content, ensuring that patient data remains encrypted end-to-end.

---

## **V. Technical Innovations (App Differentiators)**

### **A. Edge-Based AI Data Minimization**
The system runs a **Client-Side AI Minimization module** that serves as a digital proxy for the patient. It automatically redacts sensitive data categories (e.g., genetic or psychiatric history) based on the requesting provider's medical specialty *before* the data is synchronized, ensuring proactive privacy at the source.

### **B. Blockchain-Inspired Hash-Chained Auditing**
To provide an "Immutable Audit Trail," all access events are recorded in a **Hash-Chained Ledger**. Each entry contains a deterministic hash of the preceding event; any tampering with the logs breaks the cryptographic chain. This ledger is surfaced to the patient in an intuitive dashboard using **Relative Time** formatting and visual event icons.

### **C. Isolation Forest Anomaly Detection**
For real-time security, the system integrates a Python-based monitoring microservice. It uses **Isolation Forest-based scoring** to analyze access metadata (request rate, file count, IP address) and automatically flags abnormal behaviors—such as bulk data exfiltration or unauthorized cross-ward access—for immediate patient notification and administrative lockdown.

### **D. WebAuthn Biometric Security**
All high-value data operations and consent-granting permissions are protected by **Multi-Factor Biometric Gates (WebAuthn)**. This ensures that only the verified patient can authorize the release of clinical records.

---

## **VI. Conclusion**
The EHI system restores the balance between clinical utility and patient autonomy. By combining decentralized storage, AI-driven edge minimization, and cryptographically verifiable auditing, we create a foundation for a trustworthy, patient-centric digital healthcare infrastructure. This system not only addresses the ethical gaps in modern EHRs but also provides a robust technical framework for compliance with emerging global data protection regulations.
