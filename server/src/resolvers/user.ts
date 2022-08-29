import { User } from '../entities/User'
import { MyContext } from 'src/types'
import argon2 from 'argon2'
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from 'type-graphql'
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from '../constants'
import { validateRegister } from '../utils/validateRegister'
import { sendEmail } from '../utils/sendEmail'
import { v4 } from 'uuid'

@InputType()
export class UsernamePasswordInput {
  @Field()
  email: string
  @Field()
  username: string
  @Field()
  password: string
}

@ObjectType()
export class FieldError {
  @Field()
  field: string
  @Field()
  message: string
}

@ObjectType()
export class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]

  @Field(() => User, { nullable: true })
  user?: User
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.session.userId === user.id) {
      return user.email
    }

    return ''
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    console.log(req.session)
    if (!req.session.userId) {
      return null
    }
    return User.findOne(req.session.userId)
  }

  @Query(() => [User], { nullable: true })
  async allUsers() {
    return await User.find()
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options)
    if (errors) {
      return { errors }
    }
    const hashedPassword = await argon2.hash(options.password)
    let user
    try {
      user = await User.create({
        username: options.username,
        password: hashedPassword,
        email: options.email,
      }).save()
      console.log(user)
    } catch (err) {
      console.log('error', err)
      if (err.code === '23505')
        // duplicate username error
        // || err.detail.includes('already exists')
        return {
          errors: [
            {
              field: 'username',
              message: 'username already taken',
            },
          ],
        }
      console.log(err.message)
    }

    req.session.userId = (user as User).id
    return {
      user,
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes('@')
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    )
    if (!user)
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: 'user does not exist',
          },
        ],
      }
    const valid = await argon2.verify(user.password, password)
    if (!valid)
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password',
          },
        ],
      }

    req.session.userId = user.id
    console.log(req.session.userId)

    return {
      user,
    }
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise(resolve =>
      req.session.destroy(err => {
        res.clearCookie(COOKIE_NAME)
        if (err) {
          console.log(err)
          resolve(false)
          return
        }
        resolve(true)
      })
    )
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length < 3)
      return {
        errors: [
          {
            field: 'password',
            message: 'password must be 3 characters or longer',
          },
        ],
      }

    const key = FORGOT_PASSWORD_PREFIX + token
    const userId = await redis.get(key)
    if (!userId) {
      return {
        errors: [
          {
            field: 'token',
            message: 'token expired',
          },
        ],
      }
    }

    const userIdNum = parseInt(userId)
    const user = await User.findOne(userIdNum)

    if (!user) {
      return {
        errors: [
          {
            field: 'token',
            message: 'user does not exist',
          },
        ],
      }
    }

    await User.update(
      { id: userIdNum },
      { password: await argon2.hash(newPassword) }
    )

    req.session.userId = user.id

    redis.del(key)

    return {
      user,
    }
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } })
    if (!user) {
      // email not in db
      return true
    }

    const token = v4()

    await redis.set(
      FORGOT_PASSWORD_PREFIX + token,
      user.id,
      'ex',
      1000 * 60 * 60
    ) // 1h

    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    )

    return true
  }
}
