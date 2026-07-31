export const syncUser = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({ error: 'Не вдалося отримати дані користувача' });
    }

    // Повертаємо фронтенду дані з БД
    res.status(200).json({
      message: 'Користувача успішно синхронізовано з базою даних',
      user: req.user
    });
  } catch (error) {
    console.error('Помилка в authController (syncUser):', error.message);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
};