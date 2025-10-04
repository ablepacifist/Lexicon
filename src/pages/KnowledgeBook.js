import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import background from '../assets/images/dashboard_background.jpg';

const API_URL = process.env.REACT_APP_API_URL;

const KnowledgeBook = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [knowledge, setKnowledge] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchKnowledge = async () => {
        if (!user || (user.id === undefined && user.id !== 0)) return;
        setLoading(true);
        try {
const response = await fetch(
  `${API_URL}/player/knowledge/${user.id}`,
  { credentials: 'include' }
);

            if (response.ok) {
                const data = await response.json();
                setKnowledge(data);
            } else {
                const errMsg = await response.text();
                setError(errMsg);
            }
        } catch (error) {
            console.error("Error fetching knowledge book:", error);
            setError("Error fetching knowledge book");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKnowledge();
    }, [user]);

    const goBack = () => {
        navigate('/dashboard');
    };

    return (
        <div style={{
            backgroundImage: `url(${background})`,
            backgroundSize: 'cover',
            minHeight: '100vh',
            color: '#fff',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <h1>Knowledge Book</h1>
            {loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p style={{ color: 'red' }}>{error}</p>
            ) : knowledge.length === 0 ? (
                <p>You have not learned any effects yet.</p>
            ) : (
                <div>
                    {knowledge.map((entry, index) => (
                        <div key={index} style={{
                            border: '1px solid #fff',
                            padding: '1rem',
                            margin: '1rem',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0,0,0,0.5)'
                        }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', textDecoration: 'underline' }}>
                                {entry.ingredientName} {/* Ensure this is displayed! */}
                            </h2>
                            <ul style={{ listStyleType: 'none', padding: 0 }}>
                                {entry.effects.map((eff) => (
                                    <li key={eff.id} style={{ marginBottom: '0.5rem' }}>
                                        <strong>{eff.title}</strong>: {eff.description}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}


                </div>
            )}
            <button onClick={goBack} style={{ padding: '0.5rem 1rem', marginTop: '1rem' }}>
                Back to Dashboard
            </button>
        </div>
    );
};

export default KnowledgeBook;
