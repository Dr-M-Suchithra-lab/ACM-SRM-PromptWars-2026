# Key prompts

FairShift was built with **Claude Code**. These are the most important prompts I typed during the build session (26–27 October 2026), copied word for word and in order. The short notes in italics are context added afterwards; they are not part of the prompts.

---

### 1. Connect the project to GitHub

> connect with github to deploy the project I am going to do in this folder

_Set up GitHub access for the project folder before starting._

### 2. Understand the problem and explore ideas

> read the both pdf in project folder and explain me and pitch some professional ideas so which then i can work on

_Read the problem statement and submission guide, then proposed several solution designs._

### 3. Choose the design: no QR codes, a combined plan

> i am guessing ur recommendation is better cause see their phones are cheap which might not scan QR so we need something else and ur recommended plan is better which takes some plan from each plans u have listed and this should be professional as judges should or who ever sees should have some idea and know whats happening just say to this after this will say to execute or not

_This decision led to the rotating 4-digit site code (check-in without a camera) and the combined worker + manager design._

### 4. Build it

> excute the plan and make it professionally and good

_Built the FastAPI backend, worker app, manager dashboard, multilingual support, tests and security hardening._

### 5. Run it locally

> run the project in local

### 6. Deploy

> need to deploy the project in render possible

_Added the Render blueprint (`render.yaml`) alongside the Cloud Run Dockerfile._

### 7. Voice transcription with Gemini

> for voice transcription gemini api key is needed ?

_Added support for a Gemini API key read from the environment (never committed), with Vertex AI on Cloud Run and a keyword fallback when AI is unavailable._
