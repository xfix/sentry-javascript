import { assertSentryEvent, getMultipleEnvelopeRequest, runServer } from '../../../../utils';

test('should add an empty breadcrumb, when an empty object is given', async () => {
  const url = await runServer(__dirname);
  const envelopes = await getMultipleEnvelopeRequest(url, 2);
  const errorEnvelope = envelopes[1];

  expect(errorEnvelope).toHaveLength(3);

  assertSentryEvent(errorEnvelope[2], {
    message: 'test-empty-obj',
  });
});
