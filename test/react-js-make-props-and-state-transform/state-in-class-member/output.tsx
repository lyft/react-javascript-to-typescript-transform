import * as React from 'react';

export default class MyComponent extends React.Component<{}, { foo: number; }> {
    state = { foo: 1 };
    render() {
        return <div />;
    }
}
