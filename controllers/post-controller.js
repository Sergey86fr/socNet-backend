const path = require("path");
const fs = require("fs");
const { prisma } = require('../prisma/prisma-client');

const PostController = {
  createPost: async (req, res) => {
    try {
    const { content } = req.body;

    const authorId = req.user.userId;

    if (!content  && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: "Текст или изображение обязательны" });
    }

      const imagePaths = req.files 
        ? req.files.map(file => `/uploads/posts/${file.filename}`)
        : [];

      const post = await prisma.post.create({
        data: {
          content: content || "",
          images: imagePaths,
          authorId
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            }
          }
        }
      });

      res.json(post);
    } catch (error) {
      console.error("Error in createPost:", error);

      res.status(500).json({ error: "Ошибка при создании поста" });
    }
  },

  getAllPosts: async (req, res) => {
    const userId = req.user.userId;

    try {
      const posts = await prisma.post.findMany({
        include: {
          likes: true,
          author: true,
          comments: true
        },
        orderBy: {
          createdAt: 'desc' // 'desc' означает сортировку по убыванию, т.е. новые посты будут первыми
        }
      });

      const postsWithLikeInfo = posts.map(post => ({
        ...post,
        likedByUser: post.likes.some(like => like.userId === userId)
      }));

      res.json(postsWithLikeInfo);
    } catch (err) {
      res.status(500).json({ error: 'Произошла ошибка при получении постов' });
    }
  },

  getPostById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          comments: {
            include: {
              user: true,
            }
          },
          likes: true,
          author: true
        }, // Include related posts
      });

      if (!post) {
        return res.status(404).json({ error: 'Пост не найден' });
      }

      const postWithLikeInfo = {
        ...post,
        likedByUser: post.likes.some(like => like.userId === userId)
      };

      res.json(postWithLikeInfo);
    } catch (error) {
      res.status(500).json({ error: 'Произошла ошибка при получении поста' });
    }
 },


  deletePost: async (req, res) => {
    const { id } = req.params;

    // Проверка, что пользователь удаляет свой пост
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ error: "Пост не найден" });
    }

    if (post.authorId !== req.user.userId) {
      return res.status(403).json({ error: "Нет доступа" });
    }

    try {

        if (post.images && post.images.length > 0) {
      post.images.forEach(imagePath => {
        // Путь относительно корня проекта
        const fullPath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`Deleted: ${fullPath}`);
        }
      });
    }

      const transaction = await prisma.$transaction([
        prisma.comment.deleteMany({ where: { postId: id } }),
        prisma.like.deleteMany({ where: { postId: id } }),
        prisma.post.delete({ where: { id } }),
      ]);

      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: 'Что-то пошло не так' });
    }
  }
};

module.exports = PostController