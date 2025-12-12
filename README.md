
# InfoDigest: AI-Powered Summarizer
InfoDigest is an intelligent web application designed to combat information overload by automatically generating concise and coherent summaries from scientific and research documents. It leverages advanced Natural Language Processing (NLP) techniques, combining both extractive and abstractive summarization methods.

The platform supports multiple document formats (.docx, .txt, .pdf) and includes essential text analysis features like word count and keyword extraction, making academic information more accessible and digestible for researchers and a wide range of users.

## Features
Intelligent Summarization: Generates summaries using state-of-the-art extractive and abstractive models.

* Extractive: Selects the most important sentences from the original text.

* Abstractive: Generates new sentences to form a concise summary (like a human).

* Multi-Format Support: Easily upload and process files in .docx, .txt, and .pdf formats.

* Text Analysis: Provides supplementary metrics, including Word Count and Keyword Extraction.

* Robust User System: Features a MERN-based user-friendly interface with user authentication.

* Standard Users: Access summary history and provide feedback on results.

* Administrators: Manage user accounts and view overall system analytics.

## Performance Overview
The system's performance was evaluated using ROGUE (Recall-Oriented Understudy for Gisting Evaluation) metrics, comparing InfoDigest against various baselines and prior works.

**Abstractive Summarization Results**
| Metric | InfoDigest (LongT5) | Baselines |
| :--- | :---: | :---: |
| **ROGUE-1** | 0.4118 | 0.41–0.44 |
| **ROGUE-2** | 0.1619 | 0.15–0.18 |
| **ROGUE-L** | 0.2431 | 0.24–0.26 |

Interpretation: InfoDigest's Abstractive Summarization model (utilizing LongT5) achieves competitive performance, falling within the range of established baselines across all major ROGUE metrics.

**Extractive Summarization Results**
| Metric | InfoDigest | Prior Works (TextRank) | Lead-3 Baseline |
| :--- | :---: | :---: | :---: |
| **ROGUE-1** | 0.2803 | $\approx 0.30–0.33$ | $\approx 0.40–0.43$ |
| **ROGUE-2** | 0.0903 | $\approx 0.11–0.13$ | $\approx 0.17–0.20$ |
| **ROGUE-L** | 0.1876 | $\approx 0.25–0.28$ | $\approx 0.36$ |

Interpretation: For Extractive Summarization, InfoDigest provides a functional baseline using traditional NLP techniques (TF-IDF, cosine similarity, KNN, PageRank) but performs lower than the sophisticated TextRank and the simple Lead-3 baselines, indicating areas for future model improvement.

## Technology Stack
InfoDigest is built on a modern, robust, and scalable stack, integrating MERN with Python for AI models.

Core Technologies (MERN + Python)
| Category | Tool/Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **React** | User Interface and experience. |
| **Backend (Web)** | **Express.js** | Handling user authentication, API routing, and system logic. |
| **Backend (AI/ML)** | **FastAPI (Python)** | High-performance API for serving the intelligent summarization models. |
| **Database** | **MongoDB** | NoSQL database for flexible data storage (user data, summary history). |
| **AI Models** | **Python (Jupyter Notebook)** | Used for model creation, training, and deployment. |

## Algorithms
| Summarization Type | Algorithms Used |
| :--- | :--- |
| **Extractive** | TF-IDF, Cosine Similarity, K-Nearest Neighbors (KNN), PageRank |
| **Abstractive** | LongT5 (Transformer Model) |

## Development Tools & Environment
* Platform: Windows
* IDE: VS Code
* API Testing: Postman
* Environment Management: Anaconda
* GPU: NVIDIA GeForce RTX 3060 (Used for model training)
* Diagraming Tool: Draw io

## Project Structure
The repository is organized into three main directories:
InfoDigest/
├── backend/            # Express.js server (user auth, routing, general logic)
├── frontend/           # React.js client (user interface)
├── python-api/         # FastAPI server and trained intelligent models
└── README.md

## Datasets & Models
Component,Dataset,Purpose
| Component | Dataset | Purpose |
| :--- | :--- | :--- |
| **Training Dataset** | `ccdv/arxiv-summarization` | Used to train the abstractive and extractive models. |
| **Testing Dataset** | `cnn_dailymail` | Used for evaluating the final model performance. |

## Project Objectives
* To develop an AI-powered text summarization solution using Python for intelligent model creation and deploying a MERN-based web interface for users to access and condense textual content and file input into concise summaries.
* To utilize Natural Language Processing (NLP) methodologies for extractive and abstractive summarization to enable InfoDigest to intelligently process and condense text.

## References
* T. Cao, H. Lee and Y. Choi, "Hybrid Extractive-Abstractive Summarization with Retrieval-Augmented Generation," 2023.
* A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser and I. Polosukhin, "Attention Is All You Need," in Advances in Neural Information Processing Systems (NeurIPS), 2017.
* L. Fred, "Automatic Text Summarization with Machine Learning: An Overview," 2021.
* B. Sharma, A. Choudhary, M. Ahmad and S. Kharel, "Evaluation of Extractive and Abstractive Approaches for Text Summarization," Engineering Proceedings, vol. 59, no. 1, p. 194, 2023.
* M. Anwar, R. Raj and K. Yadav, "Text Summarization using Deep Learning: A Study on Automatic Summarization," 2024.
* A. Nenkova and K. McKeown, "Abstractive summarization: An overview of the state of the art," Foundations and Trends in Information Retrieval, vol. 14, no. 5, p. 335–422, 2019.
* O. Article, "Anwar, M.; Raj, R.; Yadav, K.," Abstractive Text Summarization: State of the Art, Challenges, and Improvements, 2024.
* W.-T. Hsu, C.-K. Lin, M.-Y. Lee, K. Min, J. Tang and M. Sun, "A Unified Model for Extractive and Abstractive Summarization using Inconsistency Loss," in Proc. of the 56th Annual Meeting of the Association for Computational Linguistics (ACL), Melbourne, Australia, 2018.
* S. Subramanian, R. Nallapati and B. Xiang, "On Extractive and Abstractive Neural Document Summarization with Transformer Language Models," in Proc. of the 2019 Conference on Empirical Methods in Natural Language Processing and the 9th International Joint Conference on Natural Language Processing (EMNLP-IJCNLP), Hong Kong, China, 2019.
* S. Shinde, S. Nema and S. Raut, "Extractive-Abstractive Approach for Multi-document Summarization," in Extractive-Abstractive Approach for Multi-document Summarization, Dublin, Ireland, 2022.
