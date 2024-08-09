import React, { useState } from 'react';
import WrapCoin from './WrapCoin'; // Import the WrapCoin component
import Button from './Button'; // Import the Button component

const WrapCoinContainer = () => {
  const [showWrapCoin, setShowWrapCoin] = useState(false);

  const toggleWrapCoin = () => {
    setShowWrapCoin((prev) => !prev);
  };

  return (
    <div className="p-6 bg-n-8 border border-n-6 rounded-lg w-full max-w-sm mx-auto mt-10">
      <Button onClick={toggleWrapCoin} className="w-full mb-6">
        {showWrapCoin ? 'Hide Wrap Coin' : 'Show Wrap Coin'}
      </Button>
      
      {showWrapCoin && <WrapCoin />}
    </div>
  );
};

export default WrapCoinContainer;
