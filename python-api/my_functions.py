import string
import math
from collections import Counter
from collections import defaultdict
import numpy as np
import pandas as pd
import networkx as nx

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.corpus import wordnet
from nltk.tokenize import sent_tokenize
from nltk.tokenize import word_tokenize

class TFIDFVectorizer:
    def __init__(self, norm='l2'):
        self.corpus_word_counts = {}  # Stores word counts per document (for TF)
        self.document_frequency = {}  # Stores how many documents each word appears in (for IDF)
        self.vocabulary = set()       # All unique words across the corpus
        self.num_documents = 0
        self.word_to_idx = {}         # Mapping of word to its index in the vocabulary
        self.norm = norm

    def get_wordnet_pos(self, treebank_tag):
        if treebank_tag.startswith('J'):  # Adjective
            return wordnet.ADJ
        elif treebank_tag.startswith('V'):  # Verb
            return wordnet.VERB
        elif treebank_tag.startswith('N'):  # Noun
            return wordnet.NOUN
        elif treebank_tag.startswith('R'):  # Adverb
            return wordnet.ADV
        else:
            # Default to noun if no clear mapping, or return None to let lemmatizer default
            return wordnet.NOUN

    def preprocess_text(self, input_text):
        input_text = input_text.lower()

        # Remove punctuations
        normalized_sentence = input_text.translate(str.maketrans('', '', string.punctuation))
        words = word_tokenize(normalized_sentence)

        # Remove stopWords
        stop_words = set(stopwords.words('english'))
        tokens = [word for word in words if word not in stop_words]

        # Lemmatization
        lemmatizer = WordNetLemmatizer()
        tagged_tokens = nltk.pos_tag(tokens)
        lemmatized_words = []
        for word, tag in tagged_tokens:
            pos = self.get_wordnet_pos(tag)
            if pos:  
                lemma = lemmatizer.lemmatize(word, pos=pos)
            else: 
                lemma = lemmatizer.lemmatize(word)
            lemmatized_words.append(lemma)
            
        return lemmatized_words

    # Learns the vocabulary and document frequencies from the given corpus.
    def fit(self, corpus):
        self.num_documents = len(corpus)

        for doc_id, document in enumerate(corpus):
            processed_tokens = self.preprocess_text(document) 

            # Update vocabulary and document frequency
            unique_words_in_doc = set()
            for word in processed_tokens:
                self.vocabulary.add(word)
                unique_words_in_doc.add(word)

            for word in unique_words_in_doc:
                self.document_frequency[word] = self.document_frequency.get(word, 0) + 1

            self.corpus_word_counts[doc_id] = Counter(processed_tokens)

        self.vocabulary = sorted(list(self.vocabulary))
        self.word_to_idx = {word: idx for idx, word in enumerate(self.vocabulary)}

    def _calculate_idf(self, word):
        # 'smooth IDF' variant: log((N + 1) / (DF(t) + 1)) + 1
        df_t = self.document_frequency.get(word, 0)
        return math.log((self.num_documents + 1) / (df_t + 1)) + 1

    # Transforms a list of documents into TF-IDF vectors with optional L2 normalization.
    def transform(self, documents):
        tfidf_matrix = []

        temp_document_word_counts = {}
        for temp_doc_id, document in enumerate(documents):
            processed_tokens = self.preprocess_text(document)
            temp_document_word_counts[temp_doc_id] = Counter(processed_tokens)

            # Initialize a NumPy array for the current document with zeros
            tfidf_vector = np.zeros(len(self.vocabulary))

            # Calculate TF-IDF for each word in the current document
            for word in processed_tokens:
                if word in self.word_to_idx:  # Ensure word is in our learned vocabulary
                    # Term Frequency calculation for the current document
                    current_doc_word_count = temp_document_word_counts[temp_doc_id].get(word, 0)
                    total_words_in_current_doc = sum(temp_document_word_counts[temp_doc_id].values())

                    if total_words_in_current_doc == 0:
                        tf = 0.0
                    else:
                        tf = current_doc_word_count / total_words_in_current_doc

                    idf = self._calculate_idf(word)
                    tfidf_score = tf * idf
                    tfidf_vector[self.word_to_idx[word]] = tfidf_score

            # Apply L2 normalization
            if self.norm == 'l2':
                norm_val = np.linalg.norm(tfidf_vector)  
                if norm_val > 0:
                    tfidf_vector = tfidf_vector / norm_val  
            tfidf_matrix.append(tfidf_vector)

        return np.array(tfidf_matrix)  

    # Fits the vectorizer to the corpus and then transforms the corpus into TF-IDF vectors.
    def fit_transform(self, corpus):
        if isinstance(corpus, str):
            # If a single string, wrap it in a list to treat as one document for fitting
            documents = [corpus]
        else:
            documents = corpus 

        self.fit(documents)
        return self.transform(documents)


class TextRankSummarizer:
    def __init__(self, k_neighbors, damping_factor=0.85, max_iterations=100, tolerance=1e-4):
        # k_neighbors (int): The number of most similar neighbors to connect to each sentence.
        # damping_factor (float): The damping factor for the PageRank algorithm (typically 0.85).
        # max_iterations (int): Maximum number of PageRank iterations.
        # tolerance (float): Convergence tolerance for PageRank.
        
        self.k_neighbors = k_neighbors
        self.damping_factor = damping_factor
        self.max_iterations = max_iterations
        self.tolerance = tolerance
        
        self.sentences = []
        self.preprocessed_sentences = []
        self.tfidf_vectors = None
        self.sentence_scores = None
        self.graph = None
        self.tfidf_vectorizer = TFIDFVectorizer(norm='l2')

    def manual_cosine_similarity(self, vec1, vec2):
        dot_product = np.dot(vec1, vec2)
        norm_vec1 = np.linalg.norm(vec1)
        norm_vec2 = np.linalg.norm(vec2)
        
        if norm_vec1 == 0 or norm_vec2 == 0:
            return 0.0
        
        return dot_product / (norm_vec1 * norm_vec2)


    def _build_graph(self, tfidf_vectors):
        num_docs = tfidf_vectors.shape[0]
        if num_docs == 0:
            # print("No documents to build graph from.")
            return nx.Graph()

        doc_labels = [f"Sentence {i+1}" for i in range(num_docs)]

        # Calculate the full cosine similarity matrix
        cosine_sim_matrix = np.zeros((num_docs, num_docs))
        for i in range(num_docs):
            for j in range(num_docs):
                cosine_sim_matrix[i, j] = self.manual_cosine_similarity(tfidf_vectors[i], tfidf_vectors[j])

        # print("\n--- Full Cosine Similarity Matrix ---")
        cosine_sim_df = pd.DataFrame(cosine_sim_matrix, index=doc_labels, columns=doc_labels)
        # print(cosine_sim_df.round(4))
        # print("-" * 50)
        
        # Determine k_neighbors based on document count, if not explicitly set
        if self.k_neighbors is None:
            if num_docs <= 15:
                k_neighbors_effective = 2
            elif num_docs > 15 and num_docs <= 100:
                k_neighbors_effective = 5
            elif num_docs > 100:
                k_neighbors_effective = 10
        else:
            k_neighbors_effective = self.k_neighbors
        
        k_neighbors_effective = min(k_neighbors_effective, num_docs - 1)
        if k_neighbors_effective < 0: # Handle case of single document
            k_neighbors_effective = 0

        # print(f"\n--- Graph Edges (Relationships) with Relative Thresholding (K={k_neighbors_effective} neighbors) ---")
        graph_edges = []
        graph_adjacency_matrix_relative = np.zeros((num_docs, num_docs))
        G_relative = nx.Graph()

        # Add nodes to the graph
        for i in range(num_docs):
            G_relative.add_node(doc_labels[i])

        for i in range(num_docs):
            if k_neighbors_effective == 0:
                continue 

            temp_sims = np.copy(cosine_sim_matrix[i])
            temp_sims[i] = -1.0  # Set self-similarity to a very low value so it's not picked in top-K

            # Get the indices of the top K largest similarity scores
            top_k_indices = np.argsort(temp_sims)[-k_neighbors_effective:]

            for neighbor_idx in top_k_indices:
                similarity = cosine_sim_matrix[i, neighbor_idx]
                
                # Add edge if similarity is positive (relevant for 0.0 thresholding)
                if similarity > 1e-9: # Only add edges for positive similarity
                    # Add edge if not already added symmetrically
                    if graph_adjacency_matrix_relative[i, neighbor_idx] == 0:
                        doc1_name = doc_labels[i]
                        doc2_name = doc_labels[neighbor_idx]
                        graph_edges.append((doc1_name, doc2_name, similarity))
                        
                        # Set values in the adjacency matrix (make it symmetric)
                        graph_adjacency_matrix_relative[i, neighbor_idx] = similarity
                        graph_adjacency_matrix_relative[neighbor_idx, i] = similarity
                        G_relative.add_edge(doc1_name, doc2_name, weight=similarity)

        if graph_edges:
            # Sort edges for consistent output
            graph_edges.sort(key=lambda x: (x[0], x[1]))
            # for edge in graph_edges:
            #     print(f"  {edge[0]} <-> {edge[1]} | Similarity: {edge[2]:.4f}")
        else:
            return(f"No relationships found with K={k_neighbors_effective}. Check your K value or data.")

        # print("\n--- Graph Adjacency Matrix (Relative Thresholding with similarities as weights) ---")
        graph_adj_df_relative = pd.DataFrame(graph_adjacency_matrix_relative, index=doc_labels, columns=doc_labels)
        # print(graph_adj_df_relative.round(4))
        # print("-" * 50)

        # Graph Visualization
        # try:
        #     print("\n--- Visualizing the Graph (Relative Thresholding) ---")
        #     if G_relative.edges:
        #         pos = nx.spring_layout(G_relative, k=0.5, iterations=50) # Layout for visualization
        #         plt.figure(figsize=(10, 8))
        #         nx.draw_networkx_nodes(G_relative, pos, node_color='lightcoral', node_size=2000)
        #         nx.draw_networkx_labels(G_relative, pos, font_size=10, font_weight='bold')
                
        #         edges = G_relative.edges(data=True)
        #         # Scale weights for better visualization (e.g., thicker lines for higher similarity)
        #         max_weight = max([d['weight'] for u, v, d in edges]) if edges else 1
        #         weights = [d['weight'] * (5 / max_weight) for u, v, d in edges] if max_weight > 0 else [1]*len(edges)
                
        #         nx.draw_networkx_edges(G_relative, pos, edgelist=edges, width=weights, alpha=0.7, edge_color='darkgray')
                
        #         edge_labels = {(u, v): f"{d['weight']:.2f}" for u, v, d in edges}
        #         nx.draw_networkx_edge_labels(G_relative, pos, edge_labels=edge_labels, font_color='blue')

        #         plt.title(f"Sentence Relationship Graph (Top-K={k_neighbors_effective} Neighbors)")
        #         plt.axis('off')
        #         plt.show()
        #     else:
        #         print(f"No edges to draw in the graph (K={k_neighbors_effective} might be too small or data too sparse).")

        # except ImportError:
        #     print("\nNetworkX or Matplotlib not installed. Cannot visualize the graph.")
        #     print("Install with: pip install networkx matplotlib")
            
        return G_relative


    def _pagerank(self, graph):
        num_nodes = graph.number_of_nodes()
        if num_nodes == 0:
            return {}

        # Initialize scores equally
        scores = {node: 1.0 / num_nodes for node in graph.nodes()}

        for iteration in range(self.max_iterations):
            new_scores = {}
            total_score_sum = 0 

            for node_i in graph.nodes():
                incoming_score = 0
                
                # Sum contributions from neighbors pointing to node_i
                # In an undirected graph, graph.neighbors(node_i) gives all connected nodes
                for neighbor_j in graph.neighbors(node_i):
                    # Weight of the edge from neighbor_j to node_i
                    edge_weight = graph[neighbor_j][node_i].get('weight', 1.0) 
                    
                    # Sum of weights of all outgoing edges from neighbor_j
                    # For undirected graph, sum of weights of all edges connected to neighbor_j
                    sum_out_weights_j = sum(graph[neighbor_j][out_neighbor].get('weight', 1.0) for out_neighbor in graph.neighbors(neighbor_j))
                    
                    if sum_out_weights_j > 0:
                        incoming_score += (edge_weight / sum_out_weights_j) * scores[neighbor_j]
                
                # PageRank formula
                new_score = (1 - self.damping_factor) + self.damping_factor * incoming_score
                new_scores[node_i] = new_score
                total_score_sum += new_score

            # Normalize scores to sum to 1.0 (important for probability distribution)
            if total_score_sum > 0:
                new_scores = {node: score / total_score_sum for node, score in new_scores.items()}

            # Check for convergence
            diff = sum(abs(new_scores[node] - scores[node]) for node in graph.nodes())
            if diff < self.tolerance:
                scores = new_scores
                # # print(f"PageRank converged at iteration {iteration + 1}")
                break
            scores = new_scores
        # # print(f"PageRank finished after {iteration + 1} iterations.")
        return scores

    def summarize(self, text, num_sentences=None, ratio=None):
        self.sentences = sent_tokenize(text) 
        self.tfidf_vectors = self.tfidf_vectorizer.fit_transform(self.sentences)
        self.graph = self._build_graph(self.tfidf_vectors)
        self.sentence_scores = self._pagerank(self.graph)
        
        if not self.sentence_scores:
            return "Could not generate a summary. The input text might be too short or too similar."

        # Sort sentences by their PageRank score in descending order
        ranked_sentences = sorted(
            ((score, int(name.split()[-1]) - 1) for name, score in self.sentence_scores.items()),
            key=lambda x: x[0],
            reverse=True
        )
        
        # Determine how many sentences to extract
        # if num_sentences is not None:
        #     final_num_sentences = min(num_sentences, len(self.sentences))
        # elif ratio is not None:
        #     final_num_sentences = max(1, int(len(self.sentences) * ratio))
        # else: # Default if neither num_sentences nor ratio is specified
        #     final_num_sentences = min(3, len(self.sentences)) # Default to 3 sentences
        final_num_sentences = max(1, int(len(self.sentences) * ratio))

        # Extract the top-ranked sentences in their original order
        extracted_sentence_indices = sorted([idx for score, idx in ranked_sentences[:final_num_sentences]])
        
        summary_sentences = [self.sentences[idx] for idx in extracted_sentence_indices]
        return " ".join(summary_sentences)


def get_top_n_tfidf_words(summarizer, n=10):
    all_word_scores = defaultdict(float)
    
    vectorizer = summarizer.tfidf_vectorizer
    idx_to_word = {idx: word for word, idx in vectorizer.word_to_idx.items()}

    for i, vector in enumerate(summarizer.tfidf_vectors):
        for j, score in enumerate(vector):
            if score > 1e-9:
                word = idx_to_word.get(j)
                if word:
                    all_word_scores[word] = max(all_word_scores[word], score)

    sorted_words = sorted(all_word_scores.items(), key=lambda item: item[1], reverse=True)

    top_n_nouns = {}
    for word, score in sorted_words:
        try:
            tag = nltk.pos_tag([word])[0][1]
        except Exception:
            tag = None

        if tag and tag.startswith('N'):
            top_n_nouns[word] = score

        if len(top_n_nouns) >= n:
            break

    return top_n_nouns
   

def Extractive_Summarizer(input_text: str, ratio: float) -> str:
    sentences = sent_tokenize(input_text)
    sentence_count = len(sentences)
    
    if sentence_count <= 15:
        k_val = 2
    elif 15 < sentence_count <= 100:
        k_val = 5
    else:  # sentence_count > 100
        k_val = 10

    # tfidf_vectorizer = TFIDFVectorizer(norm='l2')
    # tfidf_vectors=tfidf_vectorizer.fit_transform(sentences)
    
    summarizer = TextRankSummarizer(k_neighbors=k_val)  
    
    summary = summarizer.summarize(input_text, ratio=ratio)
    top_n_nouns = get_top_n_tfidf_words(summarizer,n = 10)

    return summary, top_n_nouns

