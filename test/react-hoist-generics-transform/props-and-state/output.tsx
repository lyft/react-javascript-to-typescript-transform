import * as React from 'react';

type IMyComponentProps = {
    foo: string;
    bar: object;
};
type IMyComponentState = {
    baz: string;
    [k: string]: string;
};
export default class MyComponent extends React.Component<IMyComponentProps, IMyComponentState> {
    render() {
        return <div />;
    }
}
