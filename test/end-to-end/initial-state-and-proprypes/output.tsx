import * as React from 'react';

type MyComponentProps = {
    baz: string;
};
type MyComponentState = {
    foo: number;
    bar: string;
};
export default class MyComponent extends React.Component<MyComponentProps, MyComponentState> {
    state = { foo: 1, bar: 'str' };
    render() {
        return <div />;
    }
}
