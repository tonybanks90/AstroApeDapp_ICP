import { useState } from 'react';

import { AstroApe_backend } from 'declarations/AstroApe_backend';


function App() {
  const [greeting, setGreeting] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const name = event.target.elements.name.value;
    AstroApe_backend.greet(name).then((greeting) => {
      setGreeting(greeting);
    });
    return false;
  }

  return (
    <>
      
        </>
  );
}

export default App;
