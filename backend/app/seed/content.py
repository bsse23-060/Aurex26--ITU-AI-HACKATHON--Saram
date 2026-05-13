"""Static catalogue: courses, modules, concepts, quiz items, job roles.

Grounded in atomcamp's actual flagship programs (Data Science & AI Bootcamp,
Generative AI Bootcamp, Full-Stack Web Development, Digital Marketing).
"""

from __future__ import annotations

from typing import Dict, List

# Each course: slug, title, tagline, description, color, icon, modules
# Each module: slug, title, summary, content_md, estimated_minutes,
#              concepts: [{slug, name, description, prereqs: [concept_slug, ...]}],
#              quiz_items: [{prompt, options, answer, explanation, difficulty,
#                            concept, failure_mode}]


def courses_catalog() -> List[Dict]:
    return [
        DATA_SCIENCE,
        GENERATIVE_AI,
        FULL_STACK,
        DIGITAL_MARKETING,
    ]


def job_roles_catalog() -> List[Dict]:
    return [
        {
            "slug": "data-analyst",
            "title": "Junior Data Analyst",
            "description": "Analyse business data with SQL + Python, build dashboards, communicate findings.",
            "required_concepts": [
                {"slug": "ds.python.basics", "level": 0.7},
                {"slug": "ds.pandas.dataframes", "level": 0.7},
                {"slug": "ds.eda", "level": 0.65},
                {"slug": "ds.viz", "level": 0.65},
                {"slug": "ds.stats.intuition", "level": 0.6},
            ],
            "salary_pkr_min": 80000,
            "salary_pkr_max": 180000,
            "market_demand": 0.85,
        },
        {
            "slug": "ml-engineer",
            "title": "Machine Learning Engineer",
            "description": "Build, evaluate and deploy ML models for real products.",
            "required_concepts": [
                {"slug": "ds.python.basics", "level": 0.75},
                {"slug": "ds.pandas.dataframes", "level": 0.7},
                {"slug": "ds.ml.supervised", "level": 0.75},
                {"slug": "ds.ml.evaluation", "level": 0.75},
                {"slug": "ds.ml.regression", "level": 0.7},
                {"slug": "gen.embeddings", "level": 0.55},
            ],
            "salary_pkr_min": 120000,
            "salary_pkr_max": 280000,
            "market_demand": 0.78,
        },
        {
            "slug": "fullstack-dev",
            "title": "Full-Stack Web Developer",
            "description": "Ship modern web apps end-to-end with React + Node + SQL.",
            "required_concepts": [
                {"slug": "fs.html.css", "level": 0.7},
                {"slug": "fs.js.fundamentals", "level": 0.75},
                {"slug": "fs.react.components", "level": 0.75},
                {"slug": "fs.api.rest", "level": 0.7},
                {"slug": "fs.db.sql", "level": 0.6},
            ],
            "salary_pkr_min": 90000,
            "salary_pkr_max": 220000,
            "market_demand": 0.82,
        },
        {
            "slug": "growth-marketer",
            "title": "Growth / Digital Marketer",
            "description": "Run performance campaigns, analyse funnels, drive measurable growth.",
            "required_concepts": [
                {"slug": "dm.funnel", "level": 0.75},
                {"slug": "dm.seo", "level": 0.6},
                {"slug": "dm.paid.ads", "level": 0.7},
                {"slug": "dm.analytics", "level": 0.7},
                {"slug": "dm.content", "level": 0.55},
            ],
            "salary_pkr_min": 70000,
            "salary_pkr_max": 200000,
            "market_demand": 0.74,
        },
    ]


DATA_SCIENCE = {
    "slug": "data-science-ai",
    "title": "Data Science & AI Bootcamp",
    "tagline": "From Python first lines to production ML models.",
    "description": (
        "atomcamp's flagship 12-week journey covering Python, data wrangling, "
        "statistics, machine learning, and a capstone project."
    ),
    "color": "#7c3aed",
    "icon": "Brain",
    "modules": [
        {
            "slug": "ds.intro.python",
            "title": "Python Foundations",
            "summary": "Variables, types, control flow, functions - the absolute basics.",
            "estimated_minutes": 35,
            "content_md": (
                "# Python Foundations\n\n"
                "Python is the lingua franca of data science. Before we touch any "
                "dataset, we need fluency with three things: **variables**, "
                "**control flow**, and **functions**.\n\n"
                "## Variables\nA variable is just a label that points at a value. "
                "`x = 5` binds the name `x` to the integer `5`. Python is dynamically "
                "typed - you don't declare a type, you just assign.\n\n"
                "## Control flow\n`if/elif/else` decides which branch to run. "
                "`for x in items:` iterates. `while cond:` keeps looping while a "
                "condition holds.\n\n"
                "## Functions\nFunctions are how we package reusable logic:\n"
                "```python\ndef greet(name):\n    return f'Salaam, {name}'\n```\n\n"
                "**Why this matters**: every later module assumes you can read and "
                "write small Python functions confidently."
            ),
            "concepts": [
                {
                    "slug": "ds.python.basics",
                    "name": "Python basics",
                    "description": "Variables, types, control flow, functions.",
                    "prereqs": [],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "What does `len(['a', 'b', 'c'])` evaluate to?",
                    "options": ["3", "'abc'", "2", "Error"],
                    "answer": 0,
                    "explanation": "`len` returns the number of items in the list.",
                    "difficulty": 0.2,
                    "concept": "ds.python.basics",
                    "failure_mode": "syntax",
                },
                {
                    "prompt": "Which keyword defines a function in Python?",
                    "options": ["function", "fun", "def", "lambda"],
                    "answer": 2,
                    "explanation": "`def` introduces a function definition.",
                    "difficulty": 0.15,
                    "concept": "ds.python.basics",
                    "failure_mode": "syntax",
                },
                {
                    "prompt": "What is the output of `print(2 ** 3)`?",
                    "options": ["6", "8", "9", "Error"],
                    "answer": 1,
                    "explanation": "`**` is exponentiation; 2 to the power of 3 is 8.",
                    "difficulty": 0.25,
                    "concept": "ds.python.basics",
                    "failure_mode": "operator-confusion",
                },
                {
                    "prompt": "Pick the loop that prints numbers 0..4:",
                    "options": [
                        "for i in range(4):",
                        "for i in range(5):",
                        "for i in range(0,4):",
                        "while i<=5: print(i)",
                    ],
                    "answer": 1,
                    "explanation": "`range(5)` yields 0, 1, 2, 3, 4.",
                    "difficulty": 0.35,
                    "concept": "ds.python.basics",
                    "failure_mode": "off-by-one",
                },
                {
                    "prompt": "What does the following return: `def f(x=2): return x*x; f()`?",
                    "options": ["0", "2", "4", "TypeError"],
                    "answer": 2,
                    "explanation": "Default argument 2 is used, 2*2 == 4.",
                    "difficulty": 0.45,
                    "concept": "ds.python.basics",
                    "failure_mode": "conceptual",
                },
            ],
        },
        {
            "slug": "ds.pandas",
            "title": "Wrangling Data with Pandas",
            "summary": "DataFrames, filtering, groupby, joining real datasets.",
            "estimated_minutes": 45,
            "content_md": (
                "# Wrangling Data with Pandas\n\n"
                "`pandas` gives us the **DataFrame**, a labelled 2D table. Almost every "
                "data-science task starts with loading a DataFrame and shaping it.\n\n"
                "## Loading\n```python\nimport pandas as pd\ndf = pd.read_csv('sales.csv')\n```\n\n"
                "## Filtering\nUse boolean masks: `df[df['amount'] > 1000]`.\n\n"
                "## Group-by + aggregate\n```python\ndf.groupby('city')['amount'].sum()\n```\n\n"
                "**Tip from atomcamp instructors**: 80% of the job is `groupby` + `merge`. "
                "Practice those until they feel boring."
            ),
            "concepts": [
                {
                    "slug": "ds.pandas.dataframes",
                    "name": "DataFrames",
                    "description": "Loading, indexing, filtering tabular data.",
                    "prereqs": ["ds.python.basics"],
                },
                {
                    "slug": "ds.pandas.groupby",
                    "name": "GroupBy and aggregation",
                    "description": "Splitting data into groups and summarising.",
                    "prereqs": ["ds.pandas.dataframes"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "Which call selects rows where the column `score` is above 80?",
                    "options": [
                        "df[df.score > 80]",
                        "df.where(score > 80)",
                        "df.score(>80)",
                        "df.filter(score > 80)",
                    ],
                    "answer": 0,
                    "explanation": "Boolean indexing with the mask.",
                    "difficulty": 0.4,
                    "concept": "ds.pandas.dataframes",
                    "failure_mode": "syntax",
                },
                {
                    "prompt": "What does `df.groupby('city')['sales'].sum()` return?",
                    "options": [
                        "A dictionary of cities",
                        "A Series of summed sales indexed by city",
                        "A DataFrame with one row per sale",
                        "An error - groupby needs two columns",
                    ],
                    "answer": 1,
                    "explanation": "groupby + aggregate returns a Series (or DataFrame) indexed by the group keys.",
                    "difficulty": 0.55,
                    "concept": "ds.pandas.groupby",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "Which method merges two DataFrames on a shared key column?",
                    "options": ["df.append", "df.concat", "df.merge", "df.join_on"],
                    "answer": 2,
                    "explanation": "`df.merge` performs SQL-style joins.",
                    "difficulty": 0.45,
                    "concept": "ds.pandas.dataframes",
                    "failure_mode": "api-mismatch",
                },
                {
                    "prompt": "After `df.groupby('region').agg({'sales':'mean', 'orders':'sum'})`, the result has:",
                    "options": [
                        "One row per region, two columns",
                        "One row per order",
                        "Two rows total",
                        "Same shape as `df`",
                    ],
                    "answer": 0,
                    "explanation": "groupby collapses to one row per group with the requested aggregations.",
                    "difficulty": 0.6,
                    "concept": "ds.pandas.groupby",
                    "failure_mode": "conceptual",
                },
            ],
        },
        {
            "slug": "ds.eda.viz",
            "title": "Exploratory Data Analysis & Visualisation",
            "summary": "EDA mindset, distributions, correlations, charts that don't lie.",
            "estimated_minutes": 40,
            "content_md": (
                "# Exploratory Data Analysis\n\n"
                "**EDA is detective work**. Before any model, you stare at the data: "
                "what shape is it? Where are the outliers? Which columns correlate?\n\n"
                "## Distributions\nHistograms reveal skew. Box plots reveal outliers.\n\n"
                "## Correlation\n`df.corr()` is a fast smell-test, but correlation is not "
                "causation - log this on your forehead.\n\n"
                "## Pick the right chart\n- Trend over time -> line\n- Composition -> stacked bar\n- "
                "Distribution -> histogram\n- Relationship -> scatter."
            ),
            "concepts": [
                {
                    "slug": "ds.eda",
                    "name": "Exploratory Data Analysis",
                    "description": "Inspecting and understanding a dataset before modelling.",
                    "prereqs": ["ds.pandas.dataframes"],
                },
                {
                    "slug": "ds.viz",
                    "name": "Data visualisation",
                    "description": "Choosing the right chart for the message.",
                    "prereqs": ["ds.eda"],
                },
                {
                    "slug": "ds.stats.intuition",
                    "name": "Statistical intuition",
                    "description": "Mean vs median, variance, correlation.",
                    "prereqs": ["ds.eda"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "Best chart to show how a single variable is distributed:",
                    "options": ["Line chart", "Histogram", "Stacked bar", "Pie chart"],
                    "answer": 1,
                    "explanation": "Histograms are designed for one-variable distributions.",
                    "difficulty": 0.3,
                    "concept": "ds.viz",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "A correlation of 0.92 between A and B means:",
                    "options": [
                        "A causes B",
                        "B causes A",
                        "A and B move together strongly; causality unknown",
                        "There is no relationship",
                    ],
                    "answer": 2,
                    "explanation": "High correlation indicates association, not causation.",
                    "difficulty": 0.5,
                    "concept": "ds.stats.intuition",
                    "failure_mode": "causal-confusion",
                },
                {
                    "prompt": "Which summary is most robust to outliers?",
                    "options": ["Mean", "Median", "Sum", "Standard deviation"],
                    "answer": 1,
                    "explanation": "Median is unaffected by extreme tails.",
                    "difficulty": 0.45,
                    "concept": "ds.stats.intuition",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "A box plot's 'whiskers' usually extend to:",
                    "options": [
                        "The min and max values",
                        "+/- 1 standard deviation",
                        "+/- 1.5 IQR from the box",
                        "The 5th and 95th percentile",
                    ],
                    "answer": 2,
                    "explanation": "Standard Tukey box plot whiskers go to 1.5 * IQR.",
                    "difficulty": 0.7,
                    "concept": "ds.viz",
                    "failure_mode": "conceptual",
                },
            ],
        },
        {
            "slug": "ds.ml.intro",
            "title": "Supervised Learning Foundations",
            "summary": "Regression vs classification, train/test, metrics that matter.",
            "estimated_minutes": 50,
            "content_md": (
                "# Supervised Learning Foundations\n\n"
                "Supervised learning means we have **inputs X and labels y**, and we want a "
                "function f(X) that predicts y well on new data.\n\n"
                "## Two main tasks\n- **Regression**: predict a number (price, score).\n"
                "- **Classification**: predict a category (spam vs not, churn vs retain).\n\n"
                "## Train / test split\nNever evaluate on the data you trained on. Hold out "
                "~20% for honest evaluation.\n\n"
                "## Metrics\n- Regression: MAE, RMSE.\n- Classification: accuracy is misleading "
                "on imbalanced data - prefer precision, recall, F1, ROC-AUC."
            ),
            "concepts": [
                {
                    "slug": "ds.ml.supervised",
                    "name": "Supervised learning",
                    "description": "Learning a mapping from inputs to labels.",
                    "prereqs": ["ds.pandas.dataframes", "ds.stats.intuition"],
                },
                {
                    "slug": "ds.ml.evaluation",
                    "name": "Model evaluation",
                    "description": "Train/test split, accuracy, precision, recall, RMSE.",
                    "prereqs": ["ds.ml.supervised"],
                },
                {
                    "slug": "ds.ml.regression",
                    "name": "Linear regression",
                    "description": "Fitting a line through data; least squares.",
                    "prereqs": ["ds.ml.supervised"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "Which task is regression rather than classification?",
                    "options": [
                        "Spam vs not spam",
                        "Predicting house price",
                        "Cat vs dog image",
                        "Sentiment (pos/neg)",
                    ],
                    "answer": 1,
                    "explanation": "Regression predicts a continuous numeric value.",
                    "difficulty": 0.3,
                    "concept": "ds.ml.supervised",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "Why split data into train and test sets?",
                    "options": [
                        "To use more data",
                        "To honestly measure generalisation",
                        "To speed up training",
                        "To increase accuracy",
                    ],
                    "answer": 1,
                    "explanation": "Held-out test data measures performance on unseen examples.",
                    "difficulty": 0.4,
                    "concept": "ds.ml.evaluation",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "Logistic regression's output is best described as:",
                    "options": [
                        "An exact class label",
                        "A probability between 0 and 1",
                        "The raw input value",
                        "A residual",
                    ],
                    "answer": 1,
                    "explanation": "The sigmoid squashes the linear score into [0,1].",
                    "difficulty": 0.55,
                    "concept": "ds.ml.regression",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "On a heavily imbalanced fraud dataset, which metric is most useful?",
                    "options": ["Accuracy", "Precision and recall (F1)", "Mean squared error", "R-squared"],
                    "answer": 1,
                    "explanation": "Accuracy is misleading on imbalanced classes; F1 captures both error types.",
                    "difficulty": 0.7,
                    "concept": "ds.ml.evaluation",
                    "failure_mode": "metric-misuse",
                },
                {
                    "prompt": "RMSE compared to MAE is more sensitive to:",
                    "options": ["Small errors", "Large outlier errors", "Categorical variables", "Sample size"],
                    "answer": 1,
                    "explanation": "Squaring amplifies the contribution of large residuals.",
                    "difficulty": 0.65,
                    "concept": "ds.ml.evaluation",
                    "failure_mode": "conceptual",
                },
            ],
        },
    ],
}


GENERATIVE_AI = {
    "slug": "generative-ai",
    "title": "Generative AI Bootcamp",
    "tagline": "Build with LLMs - prompts, RAG, agents, and evaluation.",
    "description": (
        "Hands-on with modern LLMs: prompt engineering, embeddings, retrieval-augmented "
        "generation, agents, and how to evaluate them rigorously."
    ),
    "color": "#0ea5e9",
    "icon": "Sparkles",
    "modules": [
        {
            "slug": "gen.llm.basics",
            "title": "How LLMs Actually Work",
            "summary": "Tokens, context windows, temperature, why models hallucinate.",
            "estimated_minutes": 30,
            "content_md": (
                "# How LLMs Actually Work\n\n"
                "An LLM predicts the next **token**. That's it. Everything else - "
                "reasoning, code, conversation - emerges from that simple objective at "
                "huge scale.\n\n"
                "## Tokens, not words\n'unbelievable' might split into ['un', 'believ', 'able']. "
                "The model's whole context is measured in tokens, not characters.\n\n"
                "## Temperature\nLow (~0) -> deterministic; high (~1) -> creative & random.\n\n"
                "## Why models hallucinate\nThey're trained to be plausible-sounding, not "
                "truthful. RAG and verification are how we add facts."
            ),
            "concepts": [
                {
                    "slug": "gen.tokens",
                    "name": "Tokens and context windows",
                    "description": "How LLMs read input and limit context.",
                    "prereqs": [],
                },
                {
                    "slug": "gen.hallucination",
                    "name": "Why LLMs hallucinate",
                    "description": "Plausibility vs truth in language models.",
                    "prereqs": ["gen.tokens"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "Roughly, 1 English word is on average how many tokens?",
                    "options": ["10", "1.3", "0.3", "0"],
                    "answer": 1,
                    "explanation": "Most tokenisers split English at ~1.3 tokens per word.",
                    "difficulty": 0.4,
                    "concept": "gen.tokens",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "Increasing temperature mainly:",
                    "options": [
                        "Improves accuracy",
                        "Speeds up generation",
                        "Adds randomness / diversity",
                        "Reduces hallucination",
                    ],
                    "answer": 2,
                    "explanation": "Temperature scales the softmax, widening sampling diversity.",
                    "difficulty": 0.45,
                    "concept": "gen.tokens",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "Why do LLMs hallucinate?",
                    "options": [
                        "Bugs in their code",
                        "They're trained for plausibility, not truth",
                        "Out-of-date hardware",
                        "Lack of GPUs",
                    ],
                    "answer": 1,
                    "explanation": "Next-token prediction optimises plausibility, with no truth oracle.",
                    "difficulty": 0.5,
                    "concept": "gen.hallucination",
                    "failure_mode": "conceptual",
                },
            ],
        },
        {
            "slug": "gen.prompting",
            "title": "Prompt Engineering",
            "summary": "Roles, few-shot, chain-of-thought, output schemas.",
            "estimated_minutes": 35,
            "content_md": (
                "# Prompt Engineering\n\n"
                "Treat the prompt as a **specification**, not a vibe.\n\n"
                "## System / user roles\nUse the system role for stable rules: tone, format, "
                "guardrails. Use the user role for the task.\n\n"
                "## Few-shot examples\nShow 2-3 examples of the input -> output mapping. The "
                "model latches onto the pattern.\n\n"
                "## Force a schema\nAsk for JSON with specific keys; validate before using. "
                "Saves you from regex hell."
            ),
            "concepts": [
                {
                    "slug": "gen.prompt.structure",
                    "name": "Prompt structure",
                    "description": "System vs user, instructions, examples, format.",
                    "prereqs": ["gen.tokens"],
                },
                {
                    "slug": "gen.prompt.fewshot",
                    "name": "Few-shot prompting",
                    "description": "Demonstrating the task with examples in-context.",
                    "prereqs": ["gen.prompt.structure"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "Best place to put 'always reply in JSON':",
                    "options": ["End of user message", "System prompt", "After the model replies", "Nowhere - it's automatic"],
                    "answer": 1,
                    "explanation": "System prompts express stable behaviour rules.",
                    "difficulty": 0.4,
                    "concept": "gen.prompt.structure",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "Few-shot prompting means:",
                    "options": [
                        "Training the model again on a few examples",
                        "Providing 2-3 example input/output pairs inside the prompt",
                        "Using small models",
                        "Running multiple queries",
                    ],
                    "answer": 1,
                    "explanation": "Few-shot is in-context learning via demonstrations.",
                    "difficulty": 0.45,
                    "concept": "gen.prompt.fewshot",
                    "failure_mode": "terminology",
                },
                {
                    "prompt": "Chain-of-thought prompting helps because:",
                    "options": [
                        "It makes the prompt longer",
                        "It encourages step-by-step reasoning before the answer",
                        "It reduces tokens",
                        "It guarantees correctness",
                    ],
                    "answer": 1,
                    "explanation": "Verbalised reasoning often yields more accurate final answers.",
                    "difficulty": 0.55,
                    "concept": "gen.prompt.fewshot",
                    "failure_mode": "conceptual",
                },
            ],
        },
        {
            "slug": "gen.rag",
            "title": "Retrieval-Augmented Generation",
            "summary": "Embeddings, vector DBs, RAG pipelines, citations.",
            "estimated_minutes": 45,
            "content_md": (
                "# Retrieval-Augmented Generation (RAG)\n\n"
                "RAG is how we ground LLMs in **your** data without retraining them.\n\n"
                "## Pipeline\n1. Chunk documents.\n2. Embed each chunk with a sentence model.\n"
                "3. Store in a vector DB (e.g. Chroma, FAISS).\n4. At query time, embed the question, "
                "retrieve top-k similar chunks, stuff them into the prompt.\n\n"
                "## Why it works\nThe LLM no longer needs to remember facts; it just needs to "
                "synthesise an answer from the retrieved context. **Always cite.**"
            ),
            "concepts": [
                {
                    "slug": "gen.embeddings",
                    "name": "Embeddings",
                    "description": "Dense vector representations of text.",
                    "prereqs": ["gen.tokens"],
                },
                {
                    "slug": "gen.rag.pipeline",
                    "name": "RAG pipeline",
                    "description": "Chunk -> embed -> store -> retrieve -> generate.",
                    "prereqs": ["gen.embeddings", "gen.prompt.structure"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "An embedding turns text into:",
                    "options": ["A token id", "A dense numeric vector", "A SQL row", "A JSON object"],
                    "answer": 1,
                    "explanation": "Embeddings are fixed-size dense vectors capturing semantic meaning.",
                    "difficulty": 0.35,
                    "concept": "gen.embeddings",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "Cosine similarity is used in RAG because:",
                    "options": [
                        "It's the fastest function",
                        "It compares direction of vectors, not magnitude",
                        "It returns integers",
                        "It only works with English",
                    ],
                    "answer": 1,
                    "explanation": "Cosine ignores magnitude, focusing on angular (semantic) similarity.",
                    "difficulty": 0.55,
                    "concept": "gen.embeddings",
                    "failure_mode": "math",
                },
                {
                    "prompt": "The 'R' step in a RAG pipeline retrieves:",
                    "options": [
                        "The model weights",
                        "Top-k semantically similar chunks",
                        "Random documents",
                        "The user's history",
                    ],
                    "answer": 1,
                    "explanation": "Retrieval pulls the most relevant chunks to ground the answer.",
                    "difficulty": 0.5,
                    "concept": "gen.rag.pipeline",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "A common RAG failure mode is:",
                    "options": [
                        "Too few chunks indexed",
                        "Retrieved chunks irrelevant to the question",
                        "Both A and B",
                        "Embeddings being too fast",
                    ],
                    "answer": 2,
                    "explanation": "Poor chunking and irrelevant retrieval both undermine RAG quality.",
                    "difficulty": 0.65,
                    "concept": "gen.rag.pipeline",
                    "failure_mode": "pipeline",
                },
            ],
        },
    ],
}


FULL_STACK = {
    "slug": "full-stack",
    "title": "Full-Stack Web Development",
    "tagline": "Ship real apps with HTML/CSS, JavaScript, React, Node and SQL.",
    "description": (
        "From your first webpage to a deployable full-stack application. Strong "
        "focus on building, debugging and shipping."
    ),
    "color": "#16a34a",
    "icon": "Code2",
    "modules": [
        {
            "slug": "fs.html.css",
            "title": "HTML + CSS Essentials",
            "summary": "Semantic HTML, the box model, flexbox/grid.",
            "estimated_minutes": 40,
            "content_md": (
                "# HTML + CSS Essentials\n\n"
                "**Semantic HTML** is the skeleton of the web: `<header>`, `<main>`, `<section>`, "
                "`<article>`, `<footer>`.\n\n"
                "## The box model\nEvery element is a box: content, padding, border, margin. "
                "If a layout is mysterious, inspect the box.\n\n"
                "## Flexbox vs Grid\n- **Flexbox**: one-axis layouts (nav bars, button rows).\n"
                "- **Grid**: two-axis layouts (page templates, dashboards)."
            ),
            "concepts": [
                {
                    "slug": "fs.html.css",
                    "name": "HTML + CSS basics",
                    "description": "Semantic HTML and CSS layout fundamentals.",
                    "prereqs": [],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "Which CSS property best controls space *inside* an element?",
                    "options": ["margin", "padding", "border", "outline"],
                    "answer": 1,
                    "explanation": "Padding is the space between content and border.",
                    "difficulty": 0.3,
                    "concept": "fs.html.css",
                    "failure_mode": "terminology",
                },
                {
                    "prompt": "For a single-row navigation bar, the easiest layout tool is:",
                    "options": ["Floats", "CSS Grid", "Flexbox", "Tables"],
                    "answer": 2,
                    "explanation": "Flexbox shines for one-dimensional layouts.",
                    "difficulty": 0.35,
                    "concept": "fs.html.css",
                    "failure_mode": "tool-choice",
                },
                {
                    "prompt": "Which HTML element is semantic?",
                    "options": ["<div>", "<span>", "<article>", "<center>"],
                    "answer": 2,
                    "explanation": "`<article>` carries semantic meaning; div/span are generic.",
                    "difficulty": 0.4,
                    "concept": "fs.html.css",
                    "failure_mode": "terminology",
                },
            ],
        },
        {
            "slug": "fs.js",
            "title": "Modern JavaScript",
            "summary": "let/const, arrow functions, promises, async/await.",
            "estimated_minutes": 45,
            "content_md": (
                "# Modern JavaScript\n\n"
                "## let, const, var\nUse `const` by default. `let` when you need to reassign. "
                "Forget `var` exists.\n\n"
                "## Arrow functions\n```js\nconst add = (a, b) => a + b;\n```\nShorter and they "
                "don't rebind `this`.\n\n"
                "## Async/await\n`async/await` is syntactic sugar over promises - flat code "
                "that reads top-to-bottom but doesn't block."
            ),
            "concepts": [
                {
                    "slug": "fs.js.fundamentals",
                    "name": "Modern JavaScript",
                    "description": "let/const, arrow funcs, promises, async/await.",
                    "prereqs": ["fs.html.css"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "Which keyword cannot be reassigned after declaration?",
                    "options": ["var", "let", "const", "function"],
                    "answer": 2,
                    "explanation": "`const` bindings are immutable references.",
                    "difficulty": 0.3,
                    "concept": "fs.js.fundamentals",
                    "failure_mode": "syntax",
                },
                {
                    "prompt": "`async/await` is essentially syntactic sugar over:",
                    "options": ["Callbacks", "Promises", "Generators", "Threads"],
                    "answer": 1,
                    "explanation": "Async functions return promises and `await` unwraps them.",
                    "difficulty": 0.55,
                    "concept": "fs.js.fundamentals",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "What does `[1,2,3].map(x => x*2)` evaluate to?",
                    "options": ["[1,2,3]", "[2,4,6]", "[1,4,9]", "Error"],
                    "answer": 1,
                    "explanation": "`map` returns a new array with the function applied.",
                    "difficulty": 0.35,
                    "concept": "fs.js.fundamentals",
                    "failure_mode": "array-method",
                },
            ],
        },
        {
            "slug": "fs.react",
            "title": "React Components & Hooks",
            "summary": "JSX, props, useState, useEffect, composition.",
            "estimated_minutes": 50,
            "content_md": (
                "# React Components & Hooks\n\n"
                "A React **component** is a function returning JSX. **Props** flow in. "
                "**State** stays inside.\n\n"
                "## useState\n```jsx\nconst [count, setCount] = useState(0)\n```\n\n"
                "## useEffect\nRuns side-effects (fetching, subscriptions). The dependency "
                "array controls when it re-runs.\n\n"
                "## Composition over inheritance\nReact strongly prefers small components "
                "composed together over deep inheritance hierarchies."
            ),
            "concepts": [
                {
                    "slug": "fs.react.components",
                    "name": "React components & hooks",
                    "description": "Functional components, useState, useEffect, composition.",
                    "prereqs": ["fs.js.fundamentals"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "What does `useState(0)` return?",
                    "options": [
                        "Just the current state",
                        "Just a setter function",
                        "An array of [state, setter]",
                        "An object",
                    ],
                    "answer": 2,
                    "explanation": "`useState` returns a pair via array destructuring.",
                    "difficulty": 0.4,
                    "concept": "fs.react.components",
                    "failure_mode": "api",
                },
                {
                    "prompt": "An empty dependency array `useEffect(fn, [])` runs the effect:",
                    "options": [
                        "Never",
                        "Only on mount",
                        "On every render",
                        "On every state change",
                    ],
                    "answer": 1,
                    "explanation": "Empty array means no deps to watch, so it runs once after mount.",
                    "difficulty": 0.55,
                    "concept": "fs.react.components",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "Props flow ____ in React.",
                    "options": ["Bottom-up", "Top-down (parent -> child)", "Sideways", "Both ways automatically"],
                    "answer": 1,
                    "explanation": "React data flow is one-way: parent passes props to children.",
                    "difficulty": 0.35,
                    "concept": "fs.react.components",
                    "failure_mode": "conceptual",
                },
            ],
        },
        {
            "slug": "fs.api.db",
            "title": "REST APIs and SQL",
            "summary": "Express endpoints, JSON, joins, indexes.",
            "estimated_minutes": 50,
            "content_md": (
                "# REST APIs and SQL\n\n"
                "## REST\nRESTful APIs map HTTP verbs to actions: `GET /users`, "
                "`POST /users`, `PATCH /users/:id`, `DELETE /users/:id`.\n\n"
                "## SQL basics\nSELECT, WHERE, JOIN, GROUP BY. Indexes make WHERE/JOIN fast; "
                "they cost write time + storage.\n\n"
                "## Authn vs Authz\n- **Authentication**: who are you?\n- "
                "**Authorization**: what are you allowed to do?"
            ),
            "concepts": [
                {
                    "slug": "fs.api.rest",
                    "name": "REST APIs",
                    "description": "HTTP verbs, status codes, resources.",
                    "prereqs": ["fs.js.fundamentals"],
                },
                {
                    "slug": "fs.db.sql",
                    "name": "SQL basics",
                    "description": "SELECT/WHERE/JOIN/GROUP BY/INDEX.",
                    "prereqs": ["fs.api.rest"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "Which HTTP verb is idempotent and used for full-resource updates?",
                    "options": ["POST", "PUT", "PATCH", "GET"],
                    "answer": 1,
                    "explanation": "PUT replaces the whole resource and is idempotent.",
                    "difficulty": 0.55,
                    "concept": "fs.api.rest",
                    "failure_mode": "terminology",
                },
                {
                    "prompt": "200 vs 201 - the 201 status means:",
                    "options": [
                        "OK with cached data",
                        "Created (a new resource was made)",
                        "Permanently moved",
                        "Authorization failed",
                    ],
                    "answer": 1,
                    "explanation": "201 indicates a resource was successfully created.",
                    "difficulty": 0.45,
                    "concept": "fs.api.rest",
                    "failure_mode": "terminology",
                },
                {
                    "prompt": "Adding an index on a heavily queried column most helps with:",
                    "options": [
                        "INSERT speed",
                        "DELETE speed",
                        "SELECT WHERE / JOIN speed",
                        "Disk usage",
                    ],
                    "answer": 2,
                    "explanation": "Indexes accelerate lookups at the cost of write speed and storage.",
                    "difficulty": 0.65,
                    "concept": "fs.db.sql",
                    "failure_mode": "performance",
                },
            ],
        },
    ],
}


DIGITAL_MARKETING = {
    "slug": "digital-marketing",
    "title": "Digital Marketing & Growth",
    "tagline": "Funnels, SEO, paid ads, analytics - measure what matters.",
    "description": (
        "A practitioner-led program covering the full marketing funnel: SEO, "
        "content, paid acquisition, analytics, and conversion."
    ),
    "color": "#f59e0b",
    "icon": "TrendingUp",
    "modules": [
        {
            "slug": "dm.funnel",
            "title": "The Marketing Funnel",
            "summary": "Awareness, consideration, conversion, retention.",
            "estimated_minutes": 30,
            "content_md": (
                "# The Marketing Funnel\n\n"
                "Customers don't decide in a single moment. They move through:\n"
                "1. **Awareness** - they hear of you.\n"
                "2. **Consideration** - they evaluate you vs alternatives.\n"
                "3. **Conversion** - they buy.\n"
                "4. **Retention** - they come back.\n\n"
                "Each stage needs different content and different metrics."
            ),
            "concepts": [
                {
                    "slug": "dm.funnel",
                    "name": "Marketing funnel",
                    "description": "Stages a customer moves through.",
                    "prereqs": [],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "Which metric best measures the awareness stage?",
                    "options": ["Conversion rate", "Reach / impressions", "Revenue", "Churn"],
                    "answer": 1,
                    "explanation": "Awareness is about how many people you reached.",
                    "difficulty": 0.3,
                    "concept": "dm.funnel",
                    "failure_mode": "metric-misuse",
                },
                {
                    "prompt": "A leaky funnel with high traffic but low conversion most likely needs:",
                    "options": [
                        "More ad spend",
                        "Better landing pages and product/market fit",
                        "More social posts",
                        "Bigger logo",
                    ],
                    "answer": 1,
                    "explanation": "Traffic isn't the bottleneck; the conversion stage is.",
                    "difficulty": 0.6,
                    "concept": "dm.funnel",
                    "failure_mode": "diagnosis",
                },
            ],
        },
        {
            "slug": "dm.seo",
            "title": "SEO Fundamentals",
            "summary": "Keywords, on-page, technical, backlinks.",
            "estimated_minutes": 35,
            "content_md": (
                "# SEO Fundamentals\n\n"
                "Search engines reward sites that are **fast, useful, and trustworthy**.\n\n"
                "## On-page\nTitle tags, headings, alt text, internal linking.\n\n"
                "## Technical\nMobile-friendly, fast LCP, structured data.\n\n"
                "## Off-page\nQuality backlinks. One link from a respected site beats ten "
                "from random directories."
            ),
            "concepts": [
                {
                    "slug": "dm.seo",
                    "name": "Search engine optimisation",
                    "description": "On-page, technical, and off-page SEO basics.",
                    "prereqs": ["dm.funnel"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "Which is an *on-page* SEO factor?",
                    "options": ["Backlinks", "Server location", "Title tag", "Domain age"],
                    "answer": 2,
                    "explanation": "Title tags are part of on-page SEO.",
                    "difficulty": 0.4,
                    "concept": "dm.seo",
                    "failure_mode": "terminology",
                },
                {
                    "prompt": "One high-authority backlink is generally:",
                    "options": [
                        "Worth less than 10 low-quality links",
                        "Worth more than many low-quality links",
                        "Penalised by search engines",
                        "Ignored",
                    ],
                    "answer": 1,
                    "explanation": "Quality of backlinks matters more than quantity.",
                    "difficulty": 0.55,
                    "concept": "dm.seo",
                    "failure_mode": "conceptual",
                },
            ],
        },
        {
            "slug": "dm.paid",
            "title": "Paid Ads: Meta & Google",
            "summary": "Targeting, creative, bids, attribution.",
            "estimated_minutes": 40,
            "content_md": (
                "# Paid Ads: Meta & Google\n\n"
                "Different platforms, same playbook: **audience x creative x offer**.\n\n"
                "## Meta\nGreat for demand creation; lean on lookalike audiences and "
                "scroll-stopping creative.\n\n"
                "## Google\nGreat for demand capture; intent-based keywords convert better.\n\n"
                "## Attribution\nLast-click is convenient but misleading. Multi-touch "
                "models (linear, position-based, data-driven) tell the real story."
            ),
            "concepts": [
                {
                    "slug": "dm.paid.ads",
                    "name": "Paid advertising",
                    "description": "Meta, Google, targeting and bidding basics.",
                    "prereqs": ["dm.funnel"],
                },
                {
                    "slug": "dm.content",
                    "name": "Marketing content",
                    "description": "Creative, copy, and offer for each channel.",
                    "prereqs": ["dm.funnel"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "Google Search ads tend to capture which kind of demand?",
                    "options": ["Latent", "Intent-based", "Branded only", "None"],
                    "answer": 1,
                    "explanation": "Users searching are expressing intent; Google captures it.",
                    "difficulty": 0.45,
                    "concept": "dm.paid.ads",
                    "failure_mode": "conceptual",
                },
                {
                    "prompt": "Last-click attribution typically *overvalues*:",
                    "options": [
                        "Top-of-funnel awareness channels",
                        "Bottom-of-funnel branded search",
                        "Email retention",
                        "Influencer content",
                    ],
                    "answer": 1,
                    "explanation": "Last-click gives all credit to the final touchpoint, often branded search.",
                    "difficulty": 0.7,
                    "concept": "dm.paid.ads",
                    "failure_mode": "attribution",
                },
                {
                    "prompt": "Scroll-stopping creative is most critical on:",
                    "options": ["Google Search", "Email", "Meta / Instagram", "LinkedIn jobs"],
                    "answer": 2,
                    "explanation": "Feed-based platforms require the thumb-stop in the first 1-2 seconds.",
                    "difficulty": 0.4,
                    "concept": "dm.content",
                    "failure_mode": "channel-fit",
                },
            ],
        },
        {
            "slug": "dm.analytics",
            "title": "Marketing Analytics",
            "summary": "UTM, GA4 events, dashboards, common pitfalls.",
            "estimated_minutes": 30,
            "content_md": (
                "# Marketing Analytics\n\n"
                "## UTM parameters\nTag every link you don't control natively: source, "
                "medium, campaign, content, term.\n\n"
                "## GA4 events\nEverything is an event in GA4. Define **conversions** "
                "thoughtfully; not every click is a conversion.\n\n"
                "## Common pitfalls\n- Counting the same user twice across devices.\n- "
                "Confusing sessions with users.\n- Forgetting timezone alignment."
            ),
            "concepts": [
                {
                    "slug": "dm.analytics",
                    "name": "Marketing analytics",
                    "description": "UTM, GA4 events, dashboards, common pitfalls.",
                    "prereqs": ["dm.funnel"],
                },
            ],
            "quiz_items": [
                {
                    "prompt": "UTM 'medium' usually answers:",
                    "options": [
                        "Which page was clicked",
                        "What type of channel (email, cpc, social)",
                        "How big the screen was",
                        "What language the user spoke",
                    ],
                    "answer": 1,
                    "explanation": "Medium describes the channel type (cpc, email, organic, social).",
                    "difficulty": 0.5,
                    "concept": "dm.analytics",
                    "failure_mode": "terminology",
                },
                {
                    "prompt": "Sessions can be greater than users because:",
                    "options": [
                        "Some users come back",
                        "Some users count twice",
                        "Sessions include bots",
                        "All of the above can contribute",
                    ],
                    "answer": 3,
                    "explanation": "Sessions accumulate per visit; multiple sessions per user inflate the count.",
                    "difficulty": 0.6,
                    "concept": "dm.analytics",
                    "failure_mode": "definitions",
                },
            ],
        },
    ],
}
