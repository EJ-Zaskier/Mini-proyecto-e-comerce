const Comment = require('../models/Comment');
const { matchedData } = require('express-validator');


exports.create = async (req, res) => {
  const { contenido } = matchedData(req, {
    locations: ['body'],
    includeOptionals: false
  });

  const comment = await Comment.create({ contenido, usuario: req.user.id });
  return res.status(201).json({ comment });
};


exports.list = async (req, res) => {
  const comments = await Comment.find()
    .populate('usuario', 'nombre')
    .sort({ createdAt: -1 })
    .limit(100);

  return res.status(200).json({ comments });
};
