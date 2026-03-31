import { useEffect, useState } from 'react';
import api from '../services/api';


const Comments = () => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  const load = async () => {
    const res = await api.get('/comments');
    setComments(res.data.comments || []);
  };

  const send = async () => {
    if (!text.trim()) return;
    await api.post('/comments', { contenido: text.trim() });
    setText('');
    load();
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={send}>Enviar</button>
      <ul>
        {comments.map((c) => <li key={c._id}>{c.usuario.nombre}: {c.contenido}</li>)}
      </ul>
    </div>
  );
};


export default Comments;
