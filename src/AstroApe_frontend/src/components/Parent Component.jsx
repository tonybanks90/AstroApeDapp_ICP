import React, { useState } from "react";
import NewPairs from "./NewPairs";
import SwapAndDistribution from "./SwapAndDistribution";

const ParentComponent = () => {
  const [selectedTokenId, setSelectedTokenId] = useState(null);

  return (
    <div>
      <NewPairs setSelectedTokenId={setSelectedTokenId} />
      <SwapAndDistribution selectedTokenId={selectedTokenId} />
    </div>
  );
};

export default ParentComponent;
