import { supabase } from './lib/supabase';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-to-quickboard',
    title: 'Add to QuickBoard',
    contexts: ['selection', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'add-to-quickboard') {
    const textToAdd = info.selectionText || info.linkUrl;
    if (!textToAdd) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      chrome.action.openPopup?.();
      return;
    }

    const userId = sessionData.session.user.id;
    const { data: boards } = await supabase
      .from('boards')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (!boards || boards.length === 0) {
      // Create a default board if none exists
      const { data: defaultBoard } = await supabase
        .from('boards')
        .insert([{ name: 'Quick Notes', owner_id: userId }])
        .select()
        .single();

      if (defaultBoard) {
        await supabase.from('tasks').insert([
          {
            board_id: defaultBoard.id,
            owner_id: userId,
            title: textToAdd,
            status: 'todo',
          },
        ]);
      }
    } else {
      // Insert to user's primary/first board
      await supabase.from('tasks').insert([
        {
          board_id: boards[0].id,
          owner_id: userId,
          title: textToAdd,
          status: 'todo',
        },
      ]);
    }
  }
});
