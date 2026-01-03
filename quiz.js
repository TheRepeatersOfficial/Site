// Quiz Manager
class QuizManager {
    constructor() {
        this.currentQuiz = null;
        this.userAnswers = {};
        this.timer = null;
        this.timeLeft = 0;
    }
    
    startQuiz(quizId, timeLimit = 20) {
        this.timeLeft = timeLimit * 60; // Convert to seconds
        this.startTimer();
        
        // Load quiz questions
        this.loadQuiz(quizId);
    }
    
    startTimer() {
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                this.endQuiz();
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const timerElement = document.getElementById('quizTimer');
        if (timerElement) {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            timerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color when time is running out
            if (this.timeLeft < 300) {
                timerElement.style.background = 
                    'linear-gradient(135deg, #ef4444, #dc2626)';
            }
        }
    }
    
    async loadQuiz(quizId) {
        try {
            const quizDoc = await db.collection('quizzes').doc(quizId).get();
            if (quizDoc.exists) {
                this.currentQuiz = {
                    id: quizDoc.id,
                    ...quizDoc.data()
                };
                this.renderQuiz();
            } else {
                throw new Error('Quiz not found');
            }
        } catch (error) {
            console.error('Error loading quiz:', error);
            alert('Failed to load quiz. Please try again.');
        }
    }
    
    renderQuiz() {
        // Implement based on quiz type
        const container = document.getElementById('quizContainer');
        if (!container || !this.currentQuiz) return;
        
        switch (this.currentQuiz.type) {
            case 'calculation':
                this.renderCalculationQuiz(container);
                break;
            case 'gs':
                this.renderGSQuiz(container);
                break;
            case 'mock':
                this.renderMockTest(container);
                break;
            default:
                this.renderGeneralQuiz(container);
        }
    }
    
    saveAnswer(questionId, answer) {
        this.userAnswers[questionId] = answer;
    }
    
    calculateScore() {
        if (!this.currentQuiz || !this.currentQuiz.questions) return { score: 0, correct: 0, wrong: 0 };
        
        let correct = 0;
        let wrong = 0;
        let score = 0;
        
        this.currentQuiz.questions.forEach((q, index) => {
            const userAnswer = this.userAnswers[q.id || index];
            const correctAnswer = q.correctAnswer;
            
            if (userAnswer == correctAnswer) {
                correct++;
                score += q.points || 4;
            } else if (userAnswer !== undefined && userAnswer !== null) {
                wrong++;
                score -= q.negativePoints || 1;
            }
        });
        
        return { score, correct, wrong };
    }
    
    endQuiz() {
        clearInterval(this.timer);
        
        const results = this.calculateScore();
        const totalQuestions = this.currentQuiz?.questions?.length || 0;
        const accuracy = totalQuestions > 0 ? (results.correct / totalQuestions * 100) : 0;
        
        // Show results
        this.showResults(results, accuracy);
        
        // Save to Firestore
        this.saveQuizResults(results, accuracy);
    }
    
    showResults(results, accuracy) {
        // Hide quiz container
        const quizContainer = document.getElementById('quizContainer');
        if (quizContainer) quizContainer.style.display = 'none';
        
        // Show results panel
        const resultsPanel = document.getElementById('resultsPanel');
        if (resultsPanel) {
            resultsPanel.style.display = 'block';
            
            // Update result stats
            document.getElementById('correctAnswers').textContent = results.correct;
            document.getElementById('wrongAnswers').textContent = results.wrong;
            document.getElementById('totalScore').textContent = results.score;
            document.getElementById('percentile').textContent = Math.round(accuracy) + '%';
            
            // Show detailed analysis
            this.showDetailedAnalysis();
        }
    }
    
    showDetailedAnalysis() {
        const analysisDiv = document.getElementById('analysisDetails');
        if (!analysisDiv || !this.currentQuiz) return;
        
        let analysisHTML = `
            <div style="background: #f1f5f9; padding: 20px; border-radius: 10px;">
                <h4>Performance Summary:</h4>
                <p>You answered ${this.calculateScore().correct} out of ${this.currentQuiz.questions.length} questions correctly.</p>
                <p>Accuracy: ${(this.calculateScore().correct / this.currentQuiz.questions.length * 100).toFixed(1)}%</p>
                <p>Time Taken: ${((this.currentQuiz.timeLimit || 20) - (this.timeLeft / 60)).toFixed(1)} minutes</p>
                
                <h4 style="margin-top: 20px;">Question-wise Analysis:</h4>
                <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #e2e8f0;">
                            <th style="padding: 10px; text-align: left;">Question</th>
                            <th style="padding: 10px; text-align: left;">Your Answer</th>
                            <th style="padding: 10px; text-align: left;">Correct Answer</th>
                            <th style="padding: 10px; text-align: left;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        this.currentQuiz.questions.forEach((q, index) => {
            const userAnswer = this.userAnswers[q.id || index];
            const correctAnswer = q.correctAnswer;
            const isCorrect = userAnswer == correctAnswer;
            
            analysisHTML += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px;">${q.text || `Question ${index + 1}`}</td>
                    <td style="padding: 10px;">${userAnswer !== undefined ? userAnswer : 'Not attempted'}</td>
                    <td style="padding: 10px;">${correctAnswer}</td>
                    <td style="padding: 10px;">
                        ${isCorrect 
                            ? '<span style="color: #10b981;">✓ Correct</span>' 
                            : userAnswer !== undefined 
                                ? '<span style="color: #ef4444;">✗ Wrong</span>'
                                : '<span style="color: #64748b;">Not attempted</span>'}
                    </td>
                </tr>
            `;
        });
        
        analysisHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        analysisDiv.innerHTML = analysisHTML;
    }
    
    async saveQuizResults(results, accuracy) {
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        try {
            const quizData = {
                userId: user.uid,
                userName: user.displayName || user.email,
                quizId: this.currentQuiz.id,
                quizTitle: this.currentQuiz.title,
                quizType: this.currentQuiz.type,
                correctAnswers: results.correct,
                wrongAnswers: results.wrong,
                totalQuestions: this.currentQuiz.questions.length,
                score: results.score,
                accuracy: accuracy,
                timeSpent: (this.currentQuiz.timeLimit || 20) * 60 - this.timeLeft,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('quiz_results').add(quizData);
            console.log('Quiz results saved successfully');
        } catch (error) {
            console.error('Error saving quiz results:', error);
        }
    }
}

// Initialize Quiz Manager
const quizManager = new QuizManager();
