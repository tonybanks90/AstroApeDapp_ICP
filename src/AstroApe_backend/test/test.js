import { assert } from 'chai';
import { getActor } from '../src/token_factory/actors';

describe('Token Factory', () => {
  it('should deploy new token', async () => {
    const factory = getActor();
    const metadata = await factory.createToken(
      "Test Token",
      "TEST",
      "logo.png",
      "Test description",
      null,
      null,
      null,
      null
    );
    
    assert(metadata.tokenId);
    const fetched = await factory.getToken(metadata.tokenId);
    assert.equal(fetched.name, "Test Token");
  });
});