// Which layout the page is in. "Stick" pins the field at the top on phones (Draw Up and field quizzes).
export function syncView() {
  const b = document.body;
  const stick = b.dataset.tab === 'build' || b.dataset.quiz === 'field';
  if (stick) b.dataset.stick = '1';
  else delete b.dataset.stick;
}
