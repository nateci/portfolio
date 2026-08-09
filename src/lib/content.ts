// ---------------------------------------------------------------------------
// Site content: single source of truth, derived from the resume.
// Edit here; the UI reads from these structures.
// ---------------------------------------------------------------------------

export const profile = {
  name: "Nate Cirino",
  role: "Software Engineer",
  tagline:
    "I work across the stack: distributed systems in Rust, applied AI in production, and the infrastructure to ship it all at scale.",
  available: "Available May 2027",
  location: "Boston / NYC / Houston",
  email: "cirino.na@northeastern.edu",
  phone: "832-833-5202",
  links: {
    github: "https://github.com/nateci",
    linkedin: "https://linkedin.com/in/nate-cirino",
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
      "MVCC transaction layer providing snapshot isolation and linearizable reads across the cluster.",
    ],
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
      "Running in SculptAI's production infrastructure, where it actively triages incidents today.",
    ],
    demo: "sentinel",
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
      "Trained anomaly-detection models over raw hydrophone sensor data.",
      "Optimized the inference pipeline with the AWS Neuron SDK for custom-silicon deployment, cutting real-time latency.",
      "Designed the feature-engineering pipeline alongside NOAA researchers.",
    ],
    demo: "sonar",
  },
];

export type Experience = {
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
    company: "Wayfair",
    role: "Software Engineering Co-op",
    period: "Jul 2026 - present",
    location: "Boston, MA",
    current: true,
    points: [
      "Own front-of-house device stack across all Wayfair physical retail brands (AllModern, Birch Lane, Joss & Main, Perigold): e-labels, mobile, and customer/associate-facing POS.",
      "Building a supplier-agnostic e-label API unifying 4 suppliers behind one interface, powering new outlet launches.",
      "Shipped POS checkout flows: in-store scan-to-basket customer switching and live associate-entry customer sync.",
    ],
  },
  {
    company: "Wolters Kluwer",
    role: "Software Engineer",
    period: "Jul 2025 - Jun 2026",
    location: "Boston, MA",
    current: true,
    points: [
      "Integrated UpToDate Expert AI into CME accrual/redemption microservices, expanding GenAI clinical decision support to 250K+ clinicians.",
      "Built a Java Spring microservice for CME credit issuance inside Expert AI's clinician-facing workflow.",
      "Overhauled Relay JMS broker serialization with json-io across 20+ microservices, eliminating timeouts at scale.",
      "Optimized Expert AI search and filtering across 20+ microservices, improving clinical query relevance at scale.",
      "Implemented OIDC/IdP authentication via Azure across 20 enterprise health systems, securing 10K+ clinicians.",
    ],
  },
  {
    company: "SculptAI",
    role: "Software Architect",
    period: "Jan 2025 - Aug 2026",
    location: "New York, NY",
    points: [
      "Led an engineering-org restructure at a $1M-funded startup, partitioning teams into DevOps, product dev, and agentic-workflow squads.",
      "Architected a Flask backend with a RAG pipeline for personalized workout recommendations on Amazon Bedrock Knowledge Bases.",
      "Evolved the RAG stack from LangChain → Vespa → zero-ops Bedrock KB, improving retrieval quality while cutting operational overhead.",
      "Maintained 99.99% uptime for 2K+ users via AWS WAF, Datadog, and GitLab / Kubernetes / Terraform.",
      "Continuing as technical advisor on architecture and agentic-workflow direction.",
    ],
  },
  {
    company: "Chevron New Energies",
    role: "Software Engineer Intern",
    period: "May 2024 - Aug 2024",
    location: "Houston, TX",
    points: [
      "Built RESTful APIs and data pipelines with Azure Data Factory, improving product efficiency 40%.",
      "Implemented CI/CD with Azure DevOps and Kubernetes, enabling automated deployment and rollback.",
    ],
  },
  {
    company: "Legacy Community Health",
    role: "Software Engineer Intern",
    period: "May 2023 - Aug 2023",
    location: "Houston, TX",
    points: [
      "Debugged and resolved defects in production Epic (EHR) modules, helping sustain 99.9% application uptime.",
      "Reviewed code and enforced engineering standards across healthcare applications serving 100K+ patients.",
    ],
  },
];

export const skills: { group: string; items: string[] }[] = [
  {
    group: "Languages",
    items: ["Rust", "TypeScript", "Python", "C", "C++", "Java", "JavaScript", "Bash"],
  },
  {
    group: "Infrastructure",
    items: ["AWS", "Azure", "Docker", "Kubernetes", "Terraform", "Jenkins", "Buildkite", "Groovy", "Linux"],
  },
  {
    group: "Frameworks & Data",
    items: ["React", "Next.js", "Node.js", "Express", "GraphQL", "PyTorch", "TensorFlow", "PostgreSQL", "Pandas"],
  },
  {
    group: "AI / Agentic Tooling",
    items: ["Devin", "Cursor", "Claude Code", "Claude Cowork", "GitHub Copilot", "CodeRabbit"],
  },
];

export const education = {
  school: "Northeastern University",
  degree: "B.S. Computer Science, Systems Concentration",
  detail: "GPA 3.6 · Dean's List (all semesters)",
  period: "Boston, MA · May 2027",
  honors: ["json-io OSS Contributor", "Tech Lead, Northeastern Electronic Racing", "PawHacks"],
};
