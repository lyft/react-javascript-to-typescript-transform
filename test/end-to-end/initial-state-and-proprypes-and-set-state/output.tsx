import * as React from 'react';

type MyComponentProps = {
    baz: string;
};
type MyComponentState = {
    dynamicState: number;
    foo: number;
    bar: string;
};
export default class MyComponent extends React.Component<MyComponentProps, MyComponentState> {
    state = { foo: 1, bar: 'str' };
    render() {
        return <div />;
    }
    otherFn() {
        this.setState({ dynamicState: 42 });
    }
}
