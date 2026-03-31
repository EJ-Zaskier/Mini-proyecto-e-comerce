import api from './api';

const listComments = async () => {
  const { data } = await api.get('/comments');
  return data.comments || [];
};

const createComment = async (contenido) => {
  const { data } = await api.post('/comments', { contenido });
  return data;
};

export {
  listComments,
  createComment
};
