import * as React from 'react';

export default class MyComponent extends React.Component<{
    }, {
        foo: number;
    }> {

    constructor(props, context) {
        super(props, context);
        this.state = { foo: 1 };
    }

    render() {
        return <div />;
    }
}