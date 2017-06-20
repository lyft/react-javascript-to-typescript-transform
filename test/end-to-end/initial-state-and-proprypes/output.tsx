import * as React from 'react';

type IMyComponentProps = {
    baz: string;
};
type IMyComponentState = {
    foo: number;
    bar: string;
};
export default class MyComponent extends React.Component<IMyComponentProps, IMyComponentState> {
    state = { foo: 1, bar: 'str' };
    render() {
        return <div />;
    }
}