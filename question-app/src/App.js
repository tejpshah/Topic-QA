import React from 'react';
import GitQuestionApp from './GitQuestionApp';



function App() {
  return (
    <div className="App">
      <GitQuestionApp />
    </div>
  );
  
}// Add this at the top of your main file
const originalError = console.error;
console.error = (...args) => {
  if (/ResizeObserver/.test(args[0])) return;
  originalError.call(console, ...args);
};



export default App;