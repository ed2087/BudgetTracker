const Notification = {
  notifications: [],
  
  create: (userId, message, type, priority = 'medium') => {
    const notification = {
      _id: Date.now().toString(),
      userId,
      message,
      type,
      priority,
      dismissed: false,
      createdAt: new Date()
    };
    
    Notification.notifications.push(notification);
    return notification;
  },
  
  getByUser: (userId) => {
    return Notification.notifications.filter(n => 
      n.userId.toString() === userId.toString() && !n.dismissed
    ).sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  },
  
  dismiss: (notificationId) => {
    const notification = Notification.notifications.find(n => n._id === notificationId);
    if (notification) {
      notification.dismissed = true;
    }
  },
  
  dismissAll: (userId) => {
    Notification.notifications
      .filter(n => n.userId.toString() === userId.toString())
      .forEach(n => n.dismissed = true);
  },
  
  clear: () => {
    Notification.notifications = [];
  }
};

module.exports = Notification;