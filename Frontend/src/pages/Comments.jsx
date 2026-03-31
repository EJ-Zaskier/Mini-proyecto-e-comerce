import { useEffect, useState } from 'react';
import { createComment, listComments } from '../services/commentsService';


const Comments = () => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  const load = async () => {
    const nextComments = await listComments();
    setComments(nextComments);
  };

  const send = async () => {
    if (!text.trim()) return;
    await createComment(text.trim());
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
