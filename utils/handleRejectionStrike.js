const handleRejectionStrike = async (io, runnerId, chatId) => {
  const runner = await Runner.findByIdAndUpdate(
    runnerId,
    { $inc: { itemRejectionCount: 1 } },
    { new: true }
  ).select('itemRejectionCount firstName');

  if (!runner) return;

  const count = runner.itemRejectionCount;

  if (count >= 3) {
    // Ban
    await Runner.findByIdAndUpdate(runnerId, {
      runnerStatus: 'banned',
      isOnline: false,
      isAvailable: false,
    });

    io.to(`runner-${runnerId.toString()}`).emit('verificationStatus', {
      isBanned: true,
      reason: 'Your account has been banned due to repeated item or delivery rejections.',
    });

  } else if (count === 2) {
    // Warning
    const warningMsg = {
      id: `strike-warning-${Date.now()}`,
      from: 'system', type: 'system', messageType: 'system',
      text: `⚠️ Warning: You have ${count} strikes. One more rejection will result in a permanent ban.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent', senderId: 'system', senderType: 'system', style: 'warning',
    };

    await persistMessages(chatId, [warningMsg]);
    io.to(`runner-${runnerId.toString()}`).emit('message', warningMsg);
  }
};