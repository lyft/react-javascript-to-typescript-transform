import * as React from 'react';

type IMyComponentProps = {
    baz: string;
};
type IMyComponentState = {
    dynamicState: number;
    foo: number;
    bar: string;
};
export default class MyComponent extends React.Component<IMyComponentProps, IMyComponentState> {
    state = { foo: 1, bar: 'str' };
    render() {
        return <div />;
    }
    otherFn() {
        this.setState({ dynamicState: 42 });
    }
}