class SomeComponent extends React.Component<
    {
        foo: number,
    },
    {
        bar: string,
    },
> {
    static defaultProps = { foo: 'bar' };
}
