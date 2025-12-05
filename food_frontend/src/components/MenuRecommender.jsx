import React, { useState } from 'react';
import './MenuRecommender.css'; 
import eatingMotion from '../assets/img/먹는 모션.gif';
import thumbsUp from '../assets/img/따봉_이모티콘.png';
import proudFace from '../assets/img/의기양양_이모티콘.png';

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
            <div className="recommender-header-centered">
                <img src={proudFace} alt="Confident AI" className="recommender-main-avatar" />
                <h2 className="recommender-title">무엇을 드실지 고민이신가요?</h2>
            </div>
            <p className="recommender-subtitle">
                현재 기분이나 상황을 알려주세요.<br/>
                AI 영양사가 딱 맞는 메뉴를 추천해 드릴게요!
            </p>
            
            <form onSubmit={handleSubmit} className="recommender-form">
                <textarea
                    className="recommender-textarea"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="예: 비 오는 날이라 따뜻한 국물이 땡겨요."
                    rows="3"
                    disabled={isLoading}
                />
                <button type="submit" className="recommender-button" disabled={isLoading}>
                    {isLoading ? '메뉴 고르는 중...' : 'AI 추천 받기'}
                </button>
            </form>

            {error && <div className="recommender-error">{error}</div>}

            {isLoading && (
                <div className="recommender-loading">
                    <img src={eatingMotion} alt="AI Thinking..." className="recommender-loading-img" />
                    <p>음... 뭐가 좋을까... (냠냠)</p>
                </div>
            )}

            {recommendation && (
                <div className="recommender-result-area">
                    <div className="chat-message">
                        <div className="chat-avatar-wrapper">
                            <img src={thumbsUp} alt="Thumbs Up" className="chat-avatar" />
                        </div>
                        <div className="chat-bubble">
                            <h3 className="chat-author">AI 영양사</h3>
                            <p className="recommendation-content">{recommendation}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuRecommender;
