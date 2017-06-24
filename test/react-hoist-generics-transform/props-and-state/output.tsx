import * as React from 'react';

type MyComponentProps = {
    foo: string;
    bar: object;
};
type MyComponentState = {
    baz: string;
    [k: string]: string;
};
export default class MyComponent extends React.Component<MyComponentProps, MyComponentState> {
    render() {
        return <div />;
    }
}
