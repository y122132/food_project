import React, { useState } from 'react';
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
        <div className="w-full max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <div className="relative inline-block mb-4">
                    <img src={proudFace} alt="Confident AI" className="w-24 h-24 object-contain animate-bounce-slow" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">무엇을 드실지 고민이신가요?</h2>
                <p className="text-gray-500">
                    현재 기분이나 상황을 알려주세요.<br />
                    AI 영양사가 딱 맞는 메뉴를 추천해 드릴게요!
                </p>
            </div>

            <form onSubmit={handleSubmit} className="mb-8">
                <div className="relative">
                    <textarea
                        className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none shadow-sm text-gray-700 placeholder-gray-400 bg-gray-50 transition-all duration-200 min-h-[100px]"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="예: 비 오는 날이라 따뜻한 국물이 땡겨요."
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className={`
                            absolute bottom-3 right-3 px-6 py-2 rounded-xl font-semibold text-sm transition-all duration-200
                            ${isLoading
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-200'
                            }
                        `}
                        disabled={isLoading}
                    >
                        {isLoading ? '고민 중...' : '추천 받기'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center text-sm mb-6 animate-fade-in">
                    {error}
                </div>
            )}

            {isLoading && (
                <div className="flex flex-col items-center justify-center py-8 animate-fade-in">
                    <img src={eatingMotion} alt="AI Thinking..." className="w-32 h-32 object-contain mb-4" />
                    <p className="text-purple-600 font-medium animate-pulse">음... 뭐가 좋을까... (냠냠)</p>
                </div>
            )}

            {recommendation && (
                <div className="animate-slide-up">
                    <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0">
                            <img src={thumbsUp} alt="Thumbs Up" className="w-12 h-12 object-contain rounded-full bg-purple-50 p-1" />
                        </div>
                        <div className="flex-1">
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl rounded-tl-none border border-purple-100 shadow-sm">
                                <h3 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-2">
                                    AI 영양사의 추천
                                </h3>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {recommendation}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuRecommender;
