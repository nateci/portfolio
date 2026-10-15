// ---------------------------------------------------------------------------
// Site content: single source of truth, derived from the resume.
// Edit here; the UI reads from these structures.
// ---------------------------------------------------------------------------

export const profile = {
  name: "Nate Cirino",
  role: "Software Engineer",
  tagline:
    "I work across the stack: distributed systems in Rust, applied AI in production, and the infrastructure to ship it all at scale.",
  available: "Available May 1, 2027",
  location: "Boston / NYC / Houston",
  email: "cirino.na@northeastern.edu",
  phone: "832-833-5202",
  links: {
    github: "https://github.com/nateci",
    linkedin: "https://linkedin.com/in/nate-cirino",
    resume: "/resume.pdf",
  },
} as const;

export type Project = {
  id: string;
  name: string;
  blurb: string;
  period: string;
  stack: string[];
  status?: string;
  highlights: string[];
  /** headline numbers for the project page, straight from the resume */
  metrics: { value: string; label: string }[];
  /** per-project accent (a theme color token name) */
  accent: "accent" | "red" | "amber" | "blue";
  demo: "kepler" | "sentinel" | "sonar" | null;
};

export const projects: Project[] = [
  {
    id: "kepler",
    name: "Kepler",
    blurb:
      "A distributed, linearizable key-value store in Rust. From-scratch LSM-tree storage engine, from-scratch Raft consensus, MVCC transactions.",
    period: "Mar 2026 - present",
    status: "In progress",
    stack: ["Rust", "Raft", "LSM-tree", "MVCC", "Tokio"],
    highlights: [
      "Built the storage engine from the ground up: memtable, write-ahead log, and leveled SSTable compaction.",
      "Implemented Raft consensus from scratch: leader election, log replication, and membership changes.",
      "MVCC layer for snapshot isolation and linearizable reads; deployed in SculptAI's infrastructure to replace managed etcd, cutting infra cost $2,500/month while raising TPS headroom 30%.",
    ],
    metrics: [
      { value: "$2,500/mo", label: "infra cost cut vs managed etcd" },
      { value: "+30%", label: "TPS headroom" },
    ],
    accent: "accent",
    demo: "kepler",
  },
  {
    id: "sentinel",
    name: "Sentinel",
    blurb:
      "An AI SRE that triages incidents. It autonomously investigates real telemetry (metrics, traces, logs, recent deploys, runbooks), then streams a root-cause hypothesis with cited evidence and a human-approved remediation.",
    period: "Apr 2026 - present",
    status: "Full-stack · AI",
    stack: ["Next.js", "FastAPI", "Claude", "pgvector", "OpenTelemetry", "Docker"],
    highlights: [
      "Streaming agentic loop with tool-use over Prometheus / Tempo / Loki: real PromQL, TraceQL, and LogQL, not mocks.",
      "RAG over runbooks and postmortems in pgvector, with prompt caching on the frozen system prompt + tool schemas.",
      "Human-in-the-loop remediation gated behind approval, plus an eval harness scoring root-cause accuracy across labeled incidents.",
      "Running in SculptAI's production infrastructure, triaging P0/P1 incidents and cutting MTTR from 45 to 12 minutes.",
    ],
    metrics: [
      { value: "45 → 12 min", label: "MTTR on P0/P1 incidents" },
      { value: "3", label: "telemetry sources: metrics, traces, logs" },
    ],
    accent: "red",
    demo: "sentinel",
  },
  {
    id: "argus",
    name: "Argus",
    blurb:
      "Near-real-time transaction fraud scoring: streaming features, a cost-sensitive model, and a REST scoring endpoint that autoscales on AWS.",
    period: "Jan 2026 - Aug 2026",
    status: "ML · Real-time",
    stack: ["Python", "PyTorch", "MLflow", "Redis", "FastAPI", "AWS ECS"],
    highlights: [
      "40 velocity and deviation-from-profile features served from Redis Streams through a REST endpoint at 200ms p99, autoscaling on AWS ECS.",
      "Trained on a 0.5% fraud rate with class weighting and point-in-time-correct backfills to prevent label leakage.",
      "Cost-sensitive thresholds let risk teams tune per fraud type, cutting losses 15% and false positives 10%.",
    ],
    metrics: [
      { value: "200ms", label: "p99 scoring latency" },
      { value: "-15%", label: "fraud losses" },
      { value: "-10%", label: "false positives" },
    ],
    accent: "amber",
    demo: null,
  },
  {
    id: "sonar",
    name: "NOAA AUV Sonar Detection",
    blurb:
      "Sonar anomaly-detection models for NOAA autonomous underwater vehicles, optimized for custom-silicon real-time inference.",
    period: "Apr 2025 - Jul 2025",
    status: "ML · Inference",
    stack: ["Python", "PyTorch", "AWS Neuron SDK", "SageMaker"],
    highlights: [
      "Trained CNN models on thermal sensor spectrograms, reaching 94.7% precision and 91.2% recall on a 10,000+ event test set while cutting false positives 75% over prior baselines.",
      "Optimized CNN inference to sub-50ms p99 latency on a single AWS Inferentia2 core for real-time onboard AUVs.",
      "Designed the feature-engineering pipeline alongside NOAA researchers.",
    ],
    metrics: [
      { value: "94.7%", label: "precision" },
      { value: "91.2%", label: "recall" },
      { value: "<50ms", label: "p99 on one Inferentia2 core" },
    ],
    accent: "blue",
    demo: "sonar",
  },
];

export type Experience = {
  id: string;
  company: string;
  role: string;
  period: string;
  location: string;
  current?: boolean;
  incoming?: boolean;
  points: string[];
};

export const experience: Experience[] = [
  {
    id: "klaviyo",
    company: "Klaviyo",
    role: "Software Engineering Co-op",
    period: "Jan 2027 - Apr 2027",
    location: "Boston, MA",
    incoming: true,
    points: [
      "Joining the Customer Agent team, building Klaviyo's AI agent that answers shoppers across chat, email, and SMS.",
    ],
  },
  {
    id: "wayfair",
    company: "Wayfair",
    role: "Software Engineering Co-op",
    period: "Jul 2026 - Dec 2026",
    location: "Boston, MA",
    current: true,
    points: [
      "Built and presented Harbor, an internal tool routing tasks to the best-fit, lowest-cost LLM/agent (Codex, Claude Code, Devin, Cursor) and running up to 10 concurrent agent sessions across the SDLC; adopted by 100+ engineers.",
      "Owned gift card cash-out end to end across 3 teams for an October 2026 legal deadline: a federated eligibility schema, 50-state rules engine, zero-out API, and UI replacing a manual register payout behind thousands of tickets.",
    ],
  },
  {
    id: "wolters-kluwer",
    company: "Wolters Kluwer",
    role: "Software Engineering Co-op",
    period: "Jul 2025 - Jun 2026",
    location: "Boston, MA",
    points: [
      "Drove a json-io upgrade across 20+ Java Spring microservices; root-caused the failures to upstream bugs and contributed 2 major fixes to the OSS project, cutting payload size 35% and inter-service latency 28%.",
      "Implemented OIDC authentication across 20 enterprise health systems via Azure Front Door and Entra ID, securing access for 10K+ clinicians while standardizing security posture across environments.",
      "Shipped RAG search in the clinician web app for Expert AI, scoped to a clinician's Azure SSO profile, serving 78K queries/month over a LlamaIndex index of 100K+ records built through Kafka, BigQuery, and Airflow.",
    ],
  },
  {
    id: "sculptai",
    company: "SculptAI",
    role: "Software Engineer",
    period: "Jan 2025 - present",
    location: "New York, NY",
    current: true,
    points: [
      "Shipped Sentinel, an AI SRE agent in production that triages P0/P1 incidents, correlating Prometheus, Tempo, and Loki telemetry into likely root causes for the on-call engineer and cutting MTTR from 45 to 12 minutes.",
      "Engineered the full-stack application (Flask, Redux, React Native/Expo, Redis) serving 1,000+ users.",
      "Built an agentic recommendation pipeline with Google ADK, orchestrating seven linked agents (Decoder, Planner, Validator, Memory, and others) to generate and validate tens of thousands of personalized workout plans.",
    ],
  },
  {
    id: "chevron",
    company: "Chevron New Energies",
    role: "Software Engineer Intern",
    period: "May 2024 - Aug 2024",
    location: "Houston, TX",
    points: [
      "Orchestrated 200+ Azure Data Factory pipelines moving oil rig sensor data to analytics at a 99.95% success rate.",
    ],
  },
];

export const skills: { group: string; items: string[] }[] = [
  {
    group: "Languages",
    items: ["Rust", "Go", "Python", "C++", "C", "Java", "TypeScript", "JavaScript", "Kotlin", "Swift", "Bash", "SQL"],
  },
  {
    group: "Infrastructure",
    items: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Buildkite", "gRPC", "Linux"],
  },
  {
    group: "Frameworks & Data",
    items: ["React", "React Native", "Next.js", "Node.js", "Flask", "FastAPI", "Spring Boot", "Redux", "PyTorch", "PostgreSQL", "MySQL", "MongoDB", "GraphQL"],
  },
  {
    group: "AI / Agentic Tooling",
    items: ["Google ADK", "Devin", "Cursor", "Claude Code", "Claude Cowork", "GitHub Copilot", "CodeRabbit"],
  },
];

export const education = {
  school: "Northeastern University",
  degree: "B.S. Computer Science, Systems Concentration",
  detail: "GPA 3.6 · Dean's List (all semesters)",
  period: "Boston, MA · Dec 2027",
  honors: ["json-io OSS Contributor", "Tech Lead, Northeastern Electronic Racing", "PawHacks"],
};
