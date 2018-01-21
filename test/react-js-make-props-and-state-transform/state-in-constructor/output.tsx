import * as React from 'react';
type MyComponentState = { foo: number };
export default class MyComponent extends React.Component<{}, MyComponentState> {
    constructor(props, context) {
        super(props, context);
        this.state = { foo: 1 };
    }
    render() {
        return <div />;
    }
}
