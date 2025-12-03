import React, { useState } from 'react';
import './MenuRecommender.css'; // We will create this CSS file next

const MenuRecommender = ({ onRecommend }) => {
    const [query, setQuery] = useState('');
    const [recommendation, setRecommendation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) {
            setError('추천받고 싶은 메뉴에 대한 설명을 입력해주세요.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        setRecommendation('');

        try {
            // Call the actual API function passed via props
            const result = await onRecommend(query); 
            setRecommendation(result.recommendation);

        } catch (err) {
            const errorMessage = err.response?.data?.detail || '추천을 받아오는 중 오류가 발생했습니다.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="recommender-container card">
            <h2 className="recommender-title">AI 메뉴 추천 💬</h2>
            <p className="recommender-subtitle">
                AI가 당신의 기분과 상황에 맞는 최적의 메뉴를 추천해 드립니다.
                <br />
                (예: "비오고 꿀꿀한 날에 먹을만한 따뜻한 국물 요리 추천해줘")
            </p>
            <form onSubmit={handleSubmit} className="recommender-form">
                <textarea
                    className="recommender-textarea"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="원하는 메뉴에 대해 자유롭게 알려주세요..."
                    rows="3"
                    disabled={isLoading}
                />
                <button type="submit" className="recommender-button" disabled={isLoading}>
                    {isLoading ? '추천 생성 중...' : 'AI 추천받기'}
                </button>
            </form>

            {error && <div className="recommender-error">{error}</div>}

            {isLoading && (
                <div className="recommender-loading">
                    <div className="spinner"></div>
                    <p>AI가 최적의 메뉴를 찾고 있습니다...</p>
                </div>
            )}

            {recommendation && (
                <div className="recommender-result">
                    <h3>✨ AI의 추천</h3>
                    <p className="recommendation-content">{recommendation}</p>
                </div>
            )}
        </div>
    );
};

export default MenuRecommender;
